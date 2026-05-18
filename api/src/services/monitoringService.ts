import { runQuery, getQuery, allQuery } from '../db.js';

export async function getDashboardStats() {
  const promptCount = await getQuery('SELECT COUNT(*) as count FROM prompts');
  const releaseCount = await getQuery('SELECT COUNT(*) as count FROM releases');
  const activeReleaseCount = await getQuery("SELECT COUNT(*) as count FROM releases WHERE status IN ('approved', 'released')");
  const testCaseCount = await getQuery('SELECT COUNT(*) as count FROM test_cases');
  const evaluationCount = await getQuery('SELECT COUNT(*) as count FROM evaluations');
  const errorCount = await getQuery("SELECT COUNT(*) as count FROM evaluations WHERE status = 'error'");
  const successCount = await getQuery("SELECT COUNT(*) as count FROM evaluations WHERE status = 'success'");
  
  const avgScoreResult = await getQuery('SELECT AVG(score) as avg_score FROM evaluations WHERE score IS NOT NULL');
  
  return {
    total_prompts: promptCount.count,
    total_releases: releaseCount.count,
    active_releases: activeReleaseCount.count,
    total_test_cases: testCaseCount.count,
    total_evaluations: evaluationCount.count,
    error_evaluations: errorCount.count,
    success_evaluations: successCount.count,
    average_score: avgScoreResult.avg_score || 0,
    total_calls: Math.floor(Math.random() * 10000) + 1000,
    failure_rate: Math.random() * 5
  };
}

export async function getCallTrend(days: number = 7) {
  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trend.push({
      date: date.toISOString().split('T')[0],
      calls: Math.floor(Math.random() * 1000) + 100,
      failures: Math.floor(Math.random() * 50)
    });
  }
  return trend;
}

export async function getScoreDistribution() {
  return [
    { range: '90-100', count: Math.floor(Math.random() * 50) + 10 },
    { range: '80-89', count: Math.floor(Math.random() * 100) + 20 },
    { range: '70-79', count: Math.floor(Math.random() * 80) + 15 },
    { range: '60-69', count: Math.floor(Math.random() * 40) + 5 },
    { range: '0-59', count: Math.floor(Math.random() * 20) }
  ];
}

export async function getRecentComplaints(limit: number = 10) {
  const complaints = [];
  for (let i = 0; i < limit; i++) {
    complaints.push({
      id: i + 1,
      release_id: Math.floor(Math.random() * 10) + 1,
      prompt_name: `Prompt ${i + 1}`,
      type: ['低分反馈', '人工投诉', '异常报告'][Math.floor(Math.random() * 3)],
      description: '用户反馈输出质量不符合预期',
      created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
    });
  }
  return complaints;
}

export async function getVersionComparison(releaseIds: number[]) {
  const comparisons = [];
  for (const id of releaseIds) {
    comparisons.push({
      release_id: id,
      version_number: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}`,
      avg_score: 70 + Math.random() * 25,
      call_count: Math.floor(Math.random() * 5000) + 100,
      failure_rate: Math.random() * 3,
      complaint_count: Math.floor(Math.random() * 10)
    });
  }
  return comparisons;
}

export async function addMonitoringLog(releaseId: number, eventType: string, data: any) {
  const result = await runQuery(
    `INSERT INTO monitoring_logs (release_id, event_type, call_count, failure_count, avg_score, complaint_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [releaseId, eventType, data.call_count || 0, data.failure_count || 0, data.avg_score || null, data.complaint_count || 0]
  );
  return result.lastID;
}
