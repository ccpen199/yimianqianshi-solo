require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const leadsRouter = require('./routes/leads');
const trialsRouter = require('./routes/trials');
const enrollmentsRouter = require('./routes/enrollments');
const classesRouter = require('./routes/classes');
const usersRouter = require('./routes/users');
const classroomsRouter = require('./routes/classrooms');
const coursePackagesRouter = require('./routes/coursePackages');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 24344;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:24345',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/leads', leadsRouter);
app.use('/api/trials', trialsRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/users', usersRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/course-packages', coursePackagesRouter);
app.use('/api/reports', reportsRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
