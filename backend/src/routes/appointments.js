const express = require('express');
const db = require('../database/init');
const { requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { date, doctor_id, status, type } = req.query;
    let query = `
      SELECT a.*, c.name as customer_name, c.phone as customer_phone,
             u.name as doctor_name, r.name as room_name
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN users u ON a.doctor_id = u.id
      LEFT JOIN rooms r ON a.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND a.appointment_date = ?';
      params.push(date);
    }
    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND a.type = ?';
      params.push(type);
    }

    query += ' ORDER BY a.appointment_date DESC, a.start_time ASC';

    db.all(query, params, (err, appointments) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const maskedAppointments = appointments.map(apt => {
        const masked = { ...apt };
        if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
          masked.customer_phone = masked.customer_phone?.substring(0, 3) + '****' + masked.customer_phone?.substring(masked.customer_phone?.length - 4);
        }
        return masked;
      });

      res.json({ success: true, data: maskedAppointments });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', requireRoles(['consultant', 'admin', 'doctor']), (req, res) => {
  try {
    const { customer_id, doctor_id, room_id, appointment_date, start_time, end_time, type } = req.body;

    if (!customer_id || !doctor_id || !appointment_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: '必填参数不能为空' });
    }

    db.get(`
      SELECT COUNT(*) as count FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled')
      AND ((start_time <= ? AND end_time > ?)
      OR (start_time < ? AND end_time >= ?))
    `, [doctor_id, appointment_date, end_time, start_time, end_time, start_time], (err, doctorConflict) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      if (doctorConflict.count > 0) {
        return res.status(400).json({ success: false, message: '该医生此时间段已有预约' });
      }

      if (room_id) {
        db.get(`
          SELECT COUNT(*) as count FROM appointments
          WHERE room_id = ? AND appointment_date = ? AND status NOT IN ('cancelled')
          AND ((start_time <= ? AND end_time > ?)
          OR (start_time < ? AND end_time >= ?))
        `, [room_id, appointment_date, end_time, start_time, end_time, start_time], (err, roomConflict) => {
          if (err) {
            return res.status(500).json({ success: false, message: '数据库错误' });
          }

          if (roomConflict.count > 0) {
            return res.status(400).json({ success: false, message: '该房间此时间段已被占用' });
          }
          
          createAppointment();
        });
      } else {
        createAppointment();
      }
    });

    const createAppointment = () => {
      db.get("SELECT COUNT(*) as no_show_count FROM appointments WHERE customer_id = ? AND status = 'no_show'", [customer_id], (err, result) => {
        const no_show_count = result?.no_show_count || 0;

        const stmt = db.prepare(`
          INSERT INTO appointments (customer_id, doctor_id, room_id, appointment_date, start_time, end_time, type, status, no_show_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `);
        
        stmt.run(customer_id, doctor_id, room_id, appointment_date, start_time, end_time, type || 'consultation', no_show_count, function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: '创建预约失败' });
          }

          res.json({ 
            success: true, 
            data: { id: this.lastID },
            message: '预约创建成功' 
          });
        });
        stmt.finalize();
      });
    };
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', requireRoles(['consultant', 'admin', 'doctor', 'nurse']), (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason, reschedule_reason, late_reason } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: '状态不能为空' });
    }

    db.run(`
      UPDATE appointments 
      SET status = ?, cancel_reason = ?, reschedule_reason = ?, late_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, cancel_reason, reschedule_reason, late_reason, id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新预约失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '预约不存在' });
      }

      res.json({ success: true, message: '预约状态更新成功' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
