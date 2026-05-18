const { db } = require('../database/init');
const dayjs = require('dayjs');

class ScoringEngine {
  constructor() {
    this.activeRules = null;
  }

  loadActiveRules() {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM scoring_rules WHERE is_active = 1', (err, rule) => {
        if (err) {
          reject(err);
          return;
        }
        if (rule) {
          this.activeRules = {
            version: rule.version,
            profile_rules: JSON.parse(rule.profile_rules),
            behavior_rules: JSON.parse(rule.behavior_rules),
            negative_rules: JSON.parse(rule.negative_rules)
          };
        }
        resolve(this.activeRules);
      });
    });
  }

  calculateProfileScore(lead, company) {
    const details = [];
    let totalScore = 0;

    if (!this.activeRules) {
      return { score: 0, details };
    }

    for (const rule of this.activeRules.profile_rules) {
      let matched = false;
      let actualValue = '';

      switch (rule.field) {
        case 'industry':
          actualValue = company?.industry;
          matched = company?.industry === rule.value;
          break;
        case 'size':
          actualValue = company?.size;
          matched = company?.size === rule.value;
          break;
        case 'job_level':
          actualValue = lead.job_level;
          matched = lead.job_level === rule.value;
          break;
        case 'department':
          actualValue = lead.department;
          matched = lead.department === rule.value;
          break;
        case 'region':
          actualValue = lead.region || company?.region;
          matched = (lead.region === rule.value) || (company?.region === rule.value);
          break;
      }

      if (matched) {
        totalScore += rule.score;
        details.push({
          type: 'profile',
          rule_id: rule.id,
          label: rule.label,
          score: rule.score,
          matched_value: actualValue,
          explanation: `匹配"${rule.label}"规则，加${rule.score}分`
        });
      }
    }

    return { score: totalScore, details };
  }

  calculateBehaviorScore(leadId) {
    return new Promise((resolve, reject) => {
      const details = [];
      let totalScore = 0;

      if (!this.activeRules) {
        resolve({ score: 0, details });
        return;
      }

      db.all('SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC', [leadId], (err, activities) => {
        if (err) {
          reject(err);
          return;
        }

        const now = dayjs();
        const matchedActivities = new Set();

        for (const activity of activities) {
          const activityDate = dayjs(activity.created_at);
          
          for (const rule of this.activeRules.behavior_rules) {
            let matched = false;

            switch (rule.type) {
              case 'page_view':
                matched = activity.activity_type === 'page_view' && 
                          activity.page_url?.includes(rule.page);
                break;
              case 'download':
                matched = activity.activity_type === 'download' && 
                          activity.activity_data?.includes(rule.asset);
                break;
              case 'webinar':
                matched = activity.activity_type === 'webinar' && 
                          JSON.parse(activity.activity_data || '{}').action === rule.action;
                break;
              case 'conversion':
                matched = activity.activity_type === 'conversion' && 
                          JSON.parse(activity.activity_data || '{}').action === rule.action;
                break;
              case 'email':
                matched = activity.activity_type === 'email' && 
                          JSON.parse(activity.activity_data || '{}').action === rule.action;
                break;
            }

            if (matched && !matchedActivities.has(`${rule.id}_${activity.id}`)) {
              const daysDiff = now.diff(activityDate, 'day');
              const decayMultiplier = Math.max(0, 1 - (daysDiff / rule.decay_days));
              const finalScore = Math.round(rule.score * decayMultiplier);

              if (finalScore > 0) {
                totalScore += finalScore;
                matchedActivities.add(`${rule.id}_${activity.id}`);
                
                details.push({
                  type: 'behavior',
                  rule_id: rule.id,
                  label: rule.label,
                  score: finalScore,
                  base_score: rule.score,
                  activity_date: activity.created_at,
                  days_ago: daysDiff,
                  decay_multiplier: decayMultiplier,
                  explanation: `${rule.label}，${daysDiff}天前发生，衰减后得${finalScore}分(基础分${rule.score})`
                });
              }
            }
          }
        }

        resolve({ score: totalScore, details });
      });
    });
  }

  calculateNegativeScore(lead, company) {
    return new Promise((resolve, reject) => {
      const details = [];
      let totalPenalty = 0;

      if (!this.activeRules) {
        resolve({ score: 0, details });
        return;
      }

      const emailDomain = lead.email?.split('@')[1]?.toLowerCase();

      for (const rule of this.activeRules.negative_rules) {
        let matched = false;
        let matchedValue = '';

        switch (rule.field) {
          case 'email_domain':
            if (emailDomain && rule.values?.includes(emailDomain)) {
              matched = true;
              matchedValue = emailDomain;
            }
            break;
          case 'job_title':
            if (lead.job_title) {
              const title = lead.job_title.toLowerCase();
              matched = rule.keywords?.some(k => title.includes(k.toLowerCase()));
              if (matched) matchedValue = lead.job_title;
            }
            break;
          case 'domain':
            if (company?.domain) {
              const domain = company.domain.toLowerCase();
              matched = rule.keywords?.some(k => domain.includes(k.toLowerCase()));
              if (matched) matchedValue = company.domain;
            }
            break;
          case 'email':
            if (lead.email) {
              const email = lead.email.toLowerCase();
              matched = rule.keywords?.some(k => email.includes(k.toLowerCase()));
              if (matched) matchedValue = lead.email;
            }
            break;
          case undefined:
            if (rule.type === 'sales_rejected') {
              db.get('SELECT * FROM assignments WHERE lead_id = ? AND feedback_reason IS NOT NULL', [lead.id], (err, assignment) => {
                if (assignment) {
                  totalPenalty += rule.penalty;
                  details.push({
                    type: 'negative',
                    rule_id: rule.id,
                    label: rule.label,
                    score: rule.penalty,
                    matched_value: '销售退回',
                    explanation: `匹配"${rule.label}"规则，扣${Math.abs(rule.penalty)}分`
                  });
                }
              });
              continue;
            }
            break;
        }

        if (matched) {
          totalPenalty += rule.penalty;
          details.push({
            type: 'negative',
            rule_id: rule.id,
            label: rule.label,
            score: rule.penalty,
            matched_value: matchedValue,
            explanation: `匹配"${rule.label}"规则，扣${Math.abs(rule.penalty)}分`
          });
        }
      }

      resolve({ score: totalPenalty, details });
    });
  }

  determineHeatLevel(totalScore) {
    if (totalScore >= 80) return 'hot';
    if (totalScore >= 50) return 'warm';
    if (totalScore >= 20) return 'lukewarm';
    return 'cold';
  }

  determinePriority(totalScore, heatLevel) {
    if (totalScore >= 100) return 5;
    if (totalScore >= 80) return 4;
    if (totalScore >= 50) return 3;
    if (totalScore >= 20) return 2;
    return 1;
  }

  async scoreLead(leadId) {
    await this.loadActiveRules();
    
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
          const profileResult = this.calculateProfileScore(lead, company);
          const behaviorResult = await this.calculateBehaviorScore(leadId);
          const negativeResult = await this.calculateNegativeScore(lead, company);

          const totalScore = profileResult.score + behaviorResult.score + negativeResult.score;
          const heatLevel = this.determineHeatLevel(totalScore);
          const priority = this.determinePriority(totalScore, heatLevel);

          const allDetails = [
            ...profileResult.details,
            ...behaviorResult.details,
            ...negativeResult.details
          ];

          db.run(`
            UPDATE leads 
            SET total_score = ?,
                profile_score = ?,
                behavior_score = ?,
                negative_score = ?,
                scoring_version = ?,
                scoring_details = ?,
                heat_level = ?,
                priority = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            totalScore,
            profileResult.score,
            behaviorResult.score,
            negativeResult.score,
            this.activeRules?.version || null,
            JSON.stringify(allDetails),
            heatLevel,
            priority,
            leadId
          ]);

          resolve({
            lead_id: leadId,
            total_score: totalScore,
            profile_score: profileResult.score,
            behavior_score: behaviorResult.score,
            negative_score: negativeResult.score,
            scoring_version: this.activeRules?.version,
            heat_level: heatLevel,
            priority,
            details: allDetails,
            explanation: this.generateExplanation(
              profileResult.score,
              behaviorResult.score,
              negativeResult.score,
              allDetails
            )
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  generateExplanation(profileScore, behaviorScore, negativeScore, details) {
    const total = profileScore + behaviorScore + negativeScore;
    
    const parts = [];
    parts.push(`总分为 ${total} 分，由三部分构成：`);
    parts.push(`• 画像分：${profileScore} 分，基于行业、规模、职位等静态属性`);
    parts.push(`• 行为分：${behaviorScore} 分，基于近期互动行为`);
    parts.push(`• 扣分项：${negativeScore} 分，对低质量信号进行惩罚`);
    
    if (details && details.length > 0) {
      parts.push('\n具体明细：');
      details.forEach(d => {
        parts.push(`• ${d.explanation}`);
      });
    }

    return parts.join('\n');
  }

  async recalculateAll() {
    await this.loadActiveRules();
    
    return new Promise((resolve, reject) => {
      db.all('SELECT id FROM leads WHERE is_merged = 0', async (err, leads) => {
        if (err) {
          reject(err);
          return;
        }

        const results = [];
        for (const lead of leads) {
          try {
            const result = await this.scoreLead(lead.id);
            results.push({ lead_id: lead.id, success: true, result });
          } catch (error) {
            results.push({ lead_id: lead.id, success: false, error: error.message });
          }
        }
        
        resolve(results);
      });
    });
  }
}

module.exports = new ScoringEngine();