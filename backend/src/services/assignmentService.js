const { db } = require('../database/init');

class AssignmentService {
  findMatchingSales(lead, company) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM sales_reps WHERE is_active = 1', (err, reps) => {
        if (err) {
          reject(err);
          return;
        }

        const scoredReps = reps.map(rep => {
          let score = 0;
          const regions = JSON.parse(rep.regions || '[]');
          const industries = JSON.parse(rep.industries || '[]');

          if (regions.includes(lead.region)) score += 10;
          if (regions.includes(company?.region)) score += 10;
          
          if (industries.includes(company?.industry)) score += 15;

          const loadRatio = rep.current_load / rep.max_capacity;
          if (loadRatio < 0.5) score += 10;
          else if (loadRatio < 0.8) score += 5;

          return {
            ...rep,
            regions,
            industries,
            match_score: score,
            available_capacity: rep.max_capacity - rep.current_load
          };
        });

        resolve(scoredReps.filter(r => r.available_capacity > 0 && r.match_score > 0)
          .sort((a, b) => b.match_score - a.match_score));
      });
    });
  }

  isBlacklisted(salesId, leadId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT 1 FROM sales_blacklist WHERE sales_id = ? AND lead_id = ?', [salesId, leadId], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });
  }

  async autoAssignLead(leadId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM leads WHERE id = ?', [leadId], async (err, lead) => {
        if (err) {
          reject(err);
          return;
        }
        if (!lead) {
          reject(new Error('Lead not found'));
          return;
        }
        if (lead.assigned_sales_id) {
          reject(new Error('Lead already assigned'));
          return;
        }

        const getCompany = () => {
          return new Promise((resolve, reject) => {
            if (lead.company_id) {
              db.get('SELECT * FROM companies WHERE id = ?', [lead.company_id], (err, company) => {
                if (err) reject(err);
                else resolve(company);
              });
            } else {
              resolve(null);
            }
          });
        };

        try {
          const company = await getCompany();
          const matchingReps = await this.findMatchingSales(lead, company);
          
          for (const rep of matchingReps) {
            const blacklisted = await this.isBlacklisted(rep.id, leadId);
            if (blacklisted) continue;

            await new Promise((resolve, reject) => {
              db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                db.run(`
                  INSERT INTO assignments (lead_id, sales_id, reason)
                  VALUES (?, ?, ?)
                `, [leadId, rep.id, '自动分配']);
                db.run(`
                  UPDATE leads 
                  SET assigned_sales_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `, [rep.id, leadId]);
                db.run(`
                  UPDATE sales_reps 
                  SET current_load = current_load + 1, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `, [rep.id], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                  } else {
                    db.run('COMMIT');
                    resolve();
                  }
                });
              });
            });

            resolve({
              success: true,
              sales_id: rep.id,
              sales_name: rep.name,
              match_score: rep.match_score,
              reason: '自动分配成功'
            });
            return;
          }

          resolve({
            success: false,
            reason: '未找到匹配的销售代表'
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  manualAssignLead(leadId, salesId, reason = '手动分配') {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM leads WHERE id = ?', [leadId], async (err, lead) => {
        if (err) {
          reject(err);
          return;
        }
        if (!lead) {
          reject(new Error('Lead not found'));
          return;
        }

        db.get('SELECT * FROM sales_reps WHERE id = ?', [salesId], async (err, sales) => {
          if (err) {
            reject(err);
            return;
          }
          if (!sales) {
            reject(new Error('Sales rep not found'));
            return;
          }

          const blacklisted = await this.isBlacklisted(salesId, leadId);
          if (blacklisted) {
            reject(new Error('该销售已被列入黑名单，无法分配'));
            return;
          }

          try {
            await new Promise((resolve, reject) => {
              db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                if (lead.assigned_sales_id) {
                  db.run(`
                    UPDATE sales_reps 
                    SET current_load = current_load - 1 
                    WHERE id = ?
                  `, [lead.assigned_sales_id]);
                  db.run(`
                    UPDATE assignments 
                    SET status = 'reassigned' 
                    WHERE lead_id = ? AND status = 'active'
                  `, [leadId]);
                }

                db.run(`
                  INSERT INTO assignments (lead_id, sales_id, reason)
                  VALUES (?, ?, ?)
                `, [leadId, salesId, reason]);
                db.run(`
                  UPDATE leads 
                  SET assigned_sales_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `, [salesId, leadId]);
                db.run(`
                  UPDATE sales_reps 
                  SET current_load = current_load + 1, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `, [salesId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                  } else {
                    db.run('COMMIT');
                    resolve();
                  }
                });
              });
            });

            resolve({
              success: true,
              sales_id: salesId,
              sales_name: sales.name,
              reason
            });
          } catch (err) {
            reject(err);
          }
        });
      });
    });
  }

  returnLead(leadId, salesId, reason, feedback) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM assignments 
        WHERE lead_id = ? AND sales_id = ? AND status = 'active'
      `, [leadId, salesId], (err, assignment) => {
        if (err) {
          reject(err);
          return;
        }
        if (!assignment) {
          reject(new Error('Assignment not found'));
          return;
        }

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run(`
            UPDATE assignments 
            SET status = 'returned', 
                feedback_reason = ?,
                feedback_note = ?,
                feedback_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [reason, feedback, assignment.id]);
          db.run(`
            UPDATE leads 
            SET assigned_sales_id = NULL, status = 'pool', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [leadId]);
          db.run(`
            UPDATE sales_reps 
            SET current_load = current_load - 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [salesId]);
          db.run(`
            INSERT OR IGNORE INTO sales_blacklist (sales_id, lead_id, reason)
            VALUES (?, ?, ?)
          `, [salesId, leadId, reason], (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              db.run('COMMIT');
              resolve({
                success: true,
                reason: '线索已退回线索池'
              });
            }
          });
        });
      });
    });
  }

  provideFeedback(leadId, salesId, score, note) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM assignments 
        WHERE lead_id = ? AND sales_id = ? AND status = 'active'
      `, [leadId, salesId], (err, assignment) => {
        if (err) {
          reject(err);
          return;
        }
        if (!assignment) {
          reject(new Error('Assignment not found'));
          return;
        }

        db.run(`
          UPDATE assignments 
          SET feedback_score = ?,
              feedback_note = ?,
              feedback_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [score, note, assignment.id], (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        });
      });
    });
  }
}

module.exports = new AssignmentService();