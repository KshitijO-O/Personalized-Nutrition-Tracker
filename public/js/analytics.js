class Analytics {
    constructor() {
        if (!API.isLoggedIn()) { window.location.href = '/login.html'; return; }
        this.charts = {};
        this.weeklyData = [];
        this.averages   = {};
        this.profile    = null;
        this.init();
    }

    async init() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            API.clearSession(); window.location.href = '/login.html';
        });
        try {
            const [{ weekly, averages }, profile] = await Promise.all([
                API.analytics.weekly(),
                API.profile.get()
            ]);
            this.weeklyData = weekly;
            this.averages   = averages;
            this.profile    = profile;
            this.renderSummaryCards();
            this.renderCharts();
            this.renderInsights();
        } catch (err) {
            document.querySelector('.analytics-section').innerHTML +=
                `<div class="alert alert-danger"><span>Failed to load analytics: ${err.message}</span></div>`;
        }
    }

    renderSummaryCards() {
        const a = this.averages;
        document.getElementById('avgCalories').textContent = a.calories || '—';
        document.getElementById('avgProtein').textContent  = a.protein  || '—';
        document.getElementById('avgCarbs').textContent    = a.carbs    || '—';
        document.getElementById('avgFats').textContent     = a.fats     || '—';
    }

    chartDefaults() {
        return { font: { family: 'Plus Jakarta Sans, sans-serif', size: 12 }, color: '#64748b' };
    }

    renderCharts() {
        this.renderCaloriesChart();
        this.renderMacroChart();
        this.renderWeeklyChart();
    }

    renderCaloriesChart() {
        const ctx = document.getElementById('caloriesChart').getContext('2d');
        const goal = this.profile?.recommended_calories || 2000;
        if (this.charts.calories) this.charts.calories.destroy();

        this.charts.calories = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.weeklyData.map(d => d.label),
                datasets: [
                    {
                        label: 'Calories',
                        data: this.weeklyData.map(d => Math.round(d.total_calories)),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.08)',
                        tension: 0.4, fill: true,
                        pointBackgroundColor: '#22c55e', pointRadius: 4, borderWidth: 2
                    },
                    {
                        label: 'Goal',
                        data: this.weeklyData.map(() => goal),
                        borderColor: '#ef4444', borderDash: [6, 4],
                        borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: this.chartDefaults() }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + ' kcal' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    renderMacroChart() {
        const ctx = document.getElementById('macroChart').getContext('2d');
        if (this.charts.macro) this.charts.macro.destroy();

        this.charts.macro = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fats'],
                datasets: [{
                    data: [this.averages.protein || 0, this.averages.carbs || 0, this.averages.fats || 0],
                    backgroundColor: ['#3b82f6', '#f97316', '#eab308'],
                    borderWidth: 3, borderColor: '#fff', hoverOffset: 6
                }]
            },
            options: {
                responsive: true, cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { ...this.chartDefaults(), padding: 16, usePointStyle: true } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}g` } }
                }
            }
        });
    }

    renderWeeklyChart() {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        if (this.charts.weekly) this.charts.weekly.destroy();

        this.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.weeklyData.map(d => d.label),
                datasets: [
                    { label: 'Protein (g)', data: this.weeklyData.map(d => Math.round(d.total_protein)), backgroundColor: 'rgba(59,130,246,0.85)', borderRadius: 4 },
                    { label: 'Carbs (g)',   data: this.weeklyData.map(d => Math.round(d.total_carbs)),   backgroundColor: 'rgba(249,115,22,0.85)',  borderRadius: 4 },
                    { label: 'Fats (g)',    data: this.weeklyData.map(d => Math.round(d.total_fats)),    backgroundColor: 'rgba(234,179,8,0.85)',   borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { ...this.chartDefaults(), usePointStyle: true } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    renderInsights() {
        const goal = this.profile?.recommended_calories || 2000;
        const protGoal = this.profile?.recommended_protein || 150;
        const active = this.weeklyData.filter(d => d.total_calories > 0);
        const insights = [];

        if (active.length === 0) {
            document.getElementById('insightsContent').innerHTML =
                '<p style="color:var(--ink-3);font-size:0.9rem">No data yet — start logging food on the Dashboard.</p>';
            return;
        }

        const overDays  = active.filter(d => d.total_calories > goal * 1.1).length;
        const underDays = active.filter(d => d.total_calories < goal * 0.7).length;
        const avgCal    = this.averages.calories || 0;
        const avgProt   = this.averages.protein  || 0;

        if (overDays > 0)
            insights.push({ color: '#ef4444', text: `Exceeded calorie goal on ${overDays} day${overDays > 1 ? 's' : ''} this week.` });
        if (underDays > 0)
            insights.push({ color: '#f97316', text: `Under-ate on ${underDays} day${underDays > 1 ? 's' : ''} (below 70% of goal).` });
        if (Math.abs(avgCal - goal) < goal * 0.05)
            insights.push({ color: '#22c55e', text: 'Average intake is very close to your calorie goal — great consistency!' });
        if (avgProt < protGoal * 0.7)
            insights.push({ color: '#3b82f6', text: `Average protein (${avgProt}g) is below your goal of ${protGoal}g. Add more dal, paneer, or eggs.` });
        if (active.length >= 5)
            insights.push({ color: '#22c55e', text: `You logged food ${active.length} out of 7 days — great habit!` });
        else
            insights.push({ color: '#94a3b8', text: `You logged food ${active.length} of 7 days. Try to log every day for better accuracy.` });

        document.getElementById('insightsContent').innerHTML = insights.map(i =>
            `<div class="insight-bar"><div class="insight-dot" style="background:${i.color}"></div><span class="insight-text">${i.text}</span></div>`
        ).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => { new Analytics(); });
