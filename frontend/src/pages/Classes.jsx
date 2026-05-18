import React, { useState, useEffect } from 'react';
import { classesAPI, usersAPI, classroomsAPI, enrollmentsAPI } from '../api.js';

const cardStyle = {
  background: 'white',
  borderRadius: '8px',
  padding: '1.5rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  marginBottom: '1rem'
};

const buttonStyle = {
  padding: '0.5rem 1rem',
  background: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginRight: '0.5rem'
};

const inputStyle = {
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  marginRight: '0.5rem'
};

function Classes() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    grade: '',
    teacher_id: '',
    classroom_id: '',
    capacity: '20',
    schedule: '',
    start_date: '',
    end_date: ''
  });
  const [studentForm, setStudentForm] = useState({ enrollment_id: '', student_name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, teachersRes, classroomsRes, enrollRes] = await Promise.all([
        classesAPI.getAll(),
        usersAPI.getAll({ role: 'teacher' }),
        classroomsAPI.getAll(),
        enrollmentsAPI.getAll()
      ]);
      setClasses(classesRes.data.data || []);
      setTeachers(teachersRes.data.data || []);
      setClassrooms(classroomsRes.data.data || []);
      setEnrollments(enrollRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await classesAPI.create(formData);
      setShowForm(false);
      setFormData({
        name: '', subject: '', grade: '', teacher_id: '', classroom_id: '',
        capacity: '20', schedule: '', start_date: '', end_date: ''
      });
      fetchData();
      alert('班级创建成功！');
    } catch (err) {
      alert(err.response?.data?.message || '创建失败');
    }
  };

  const handleViewStudents = async (cls) => {
    setSelectedClass(cls);
    try {
      const res = await classesAPI.getStudents(cls.id);
      setStudents(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await classesAPI.addStudent(selectedClass.id, studentForm);
      setStudentForm({ enrollment_id: '', student_name: '' });
      handleViewStudents(selectedClass);
      fetchData();
      alert('分班成功！');
    } catch (err) {
      alert(err.response?.data?.message || '分班失败');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>分班排课</h2>
        <button onClick={() => setShowForm(!showForm)} style={buttonStyle}>
          {showForm ? '取消' : '创建班级'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem' }}>创建班级</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>班级名称 *</label>
              <input
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>科目 *</label>
              <select
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              >
                <option value="">请选择</option>
                <option value="数学">数学</option>
                <option value="英语">英语</option>
                <option value="语文">语文</option>
                <option value="物理">物理</option>
                <option value="化学">化学</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>年级</label>
              <select
                style={{ ...inputStyle, width: '100%' }}
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              >
                <option value="">请选择</option>
                <option value="初一">初一</option>
                <option value="初二">初二</option>
                <option value="初三">初三</option>
                <option value="高一">高一</option>
                <option value="高二">高二</option>
                <option value="高三">高三</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>授课老师 *</label>
              <select
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
              >
                <option value="">请选择</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>教室 *</label>
              <select
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.classroom_id}
                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
              >
                <option value="">请选择</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>容量</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>上课时间安排</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="如：每周一、三、五 19:00-21:00"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>开课日期</label>
              <input
                type="date"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>结束日期</label>
              <input
                type="date"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={buttonStyle}>创建班级</button>
            </div>
          </form>
        </div>
      )}

      {selectedClass && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>{selectedClass.name} - 学生名单</h3>
            <button onClick={() => setSelectedClass(null)} style={buttonStyle}>返回</button>
          </div>
          
          <form onSubmit={handleAddStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>选择报名学生</label>
              <select
                style={{ ...inputStyle, width: '100%' }}
                value={studentForm.enrollment_id}
                onChange={(e) => {
                  const enroll = enrollments.find(en => en.id === parseInt(e.target.value));
                  setStudentForm({
                    enrollment_id: e.target.value,
                    student_name: enroll ? enroll.student_name : ''
                  });
                }}
              >
                <option value="">请选择</option>
                {enrollments.map(e => (
                  <option key={e.id} value={e.id}>{e.student_name} - {e.package_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>学生姓名</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={studentForm.student_name}
                onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={buttonStyle}>加入班级</button>
            </div>
          </form>

          {students.length === 0 ? (
            <p style={{ color: '#7f8c8d' }}>暂无学生</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>学生姓名</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>总课时</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>已用课时</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>剩余课时</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>入班时间</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{s.student_name}</td>
                    <td style={{ padding: '0.75rem' }}>{s.total_hours || 0}</td>
                    <td style={{ padding: '0.75rem' }}>{s.used_hours || 0}</td>
                    <td style={{ padding: '0.75rem' }}>{(s.total_hours || 0) - (s.used_hours || 0)}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(s.join_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={cardStyle}>
        {classes.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>暂无班级</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>班级名称</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>科目</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>年级</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>老师</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>教室</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>人数/容量</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>状态</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{cls.name}</td>
                  <td style={{ padding: '0.75rem' }}>{cls.subject}</td>
                  <td style={{ padding: '0.75rem' }}>{cls.grade || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{cls.teacher_name}</td>
                  <td style={{ padding: '0.75rem' }}>{cls.classroom_name}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ color: cls.current_students >= cls.capacity ? '#e74c3c' : '#2ecc71' }}>
                      {cls.current_students}/{cls.capacity}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      background: cls.status === 'active' ? '#d4edda' : '#f8d7da',
                      color: cls.status === 'active' ? '#155724' : '#721c24'
                    }}>
                      {cls.status === 'active' ? '进行中' : '已结束'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button onClick={() => handleViewStudents(cls)} style={{ ...buttonStyle, fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                      学生名单
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Classes;
