# 教培CRM系统启动脚本
Write-Host "=== 启动教培CRM系统 ===" -ForegroundColor Green

# 启动后端服务
Write-Host "正在启动后端API服务 (端口: 24344)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$PWD\backend'; node src/server.js`"" -WindowStyle Minimized

# 等待后端启动
Start-Sleep -Seconds 3

# 启动前端服务
Write-Host "正在启动前端服务 (端口: 24345)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$PWD\frontend'; npm run dev`"" -WindowStyle Minimized

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ 系统启动完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📌 访问地址：" -ForegroundColor Cyan
Write-Host "   前端页面: http://localhost:24345"
Write-Host "   后端API:  http://localhost:24344"
Write-Host ""
Write-Host "💡 提示：请访问 http://localhost:24345 使用系统" -ForegroundColor Yellow
