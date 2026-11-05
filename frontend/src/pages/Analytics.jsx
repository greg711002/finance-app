import { useState, useEffect } from "react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	CartesianGrid,
} from "recharts";
import api from "../api";
import {
	TrendingDown,
	Minus,
	ArrowUpRight,
	ArrowDownRight,
	PiggyBank,
	Target,
	Calendar,
} from "lucide-react";

const COLORS = [
	"#2563eb",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#f97316",
];

function toLocalISO(d) {
	const off = d.getTimezoneOffset();
	const local = new Date(d.getTime() - off * 60000);
	return local.toISOString().slice(0, 10);
}

function getPeriodRange(period) {
	const end = new Date();
	const start = new Date();
	if (period === "week") {
		start.setDate(start.getDate() - 6);
	} else if (period === "month") {
		start.setMonth(start.getMonth() - 1);
	} else {
		start.setFullYear(start.getFullYear() - 1);
	}
	return { start, end };
}

function shiftBack({ start, end }) {
	const days = Math.round((end.getTime() - start.getTime()) / 86400000);
	const prevEnd = new Date(start);
	prevEnd.setDate(prevEnd.getDate() - 1);
	const prevStart = new Date(prevEnd);
	prevStart.setDate(prevStart.getDate() - (days - 1));
	return { start: prevStart, end: prevEnd };
}

const sumField = (arr, field) =>
	(arr || []).reduce((s, d) => s + (parseFloat(d[field]) || 0), 0);

export default function Analytics() {
	const [period, setPeriod] = useState("month");
	const [stats, setStats] = useState(null);
	const [trendData, setTrendData] = useState([]);
	const [prevExpense, setPrevExpense] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadStats();
	}, [period]);

	const loadStats = async () => {
		setLoading(true);
		try {
			const cur = getPeriodRange(period);
			const prev = shiftBack(cur);

			const [catRes, curRes, prevRes] = await Promise.all([
				api.get(`/stats/by-category?period=${period}`),
				api.get(
					`/stats/by-period?start=${toLocalISO(cur.start)}&end=${toLocalISO(cur.end)}`,
				),
				api.get(
					`/stats/by-period?start=${toLocalISO(prev.start)}&end=${toLocalISO(prev.end)}`,
				),
			]);

			setStats(Array.isArray(catRes.data) ? catRes.data : []);
			setTrendData(Array.isArray(curRes.data) ? curRes.data : []);
			setPrevExpense(sumField(curRes.data, "expense") === 0 ? 0 : sumField(prevRes.data, "expense"));
		} catch (err) {
			console.error("Failed to load stats", err);
			setStats([]);
			setTrendData([]);
			setPrevExpense(0);
		} finally {
			setLoading(false);
		}
	};

	const formatCurrency = (value) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			minimumFractionDigits: 0,
		}).format(value || 0);
	};

	const getTrend = (current, previous) => {
		if (!previous || previous === 0) return { value: 0, direction: "flat" };
		const change = ((current - previous) / previous) * 100;
		return {
			value: Math.abs(change).toFixed(1),
			direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
		};
	};

	const getTrendIcon = (direction) => {
		switch (direction) {
			case "up":
				return <ArrowUpRight className="w-4 h-4" />;
			case "down":
				return <ArrowDownRight className="w-4 h-4" />;
			default:
				return <Minus className="w-4 h-4" />;
		}
	};

	const totalExpense = sumField(trendData, "expense");
	const totalIncome = sumField(trendData, "income");
	const expenseTrend = getTrend(totalExpense, prevExpense);

	const pieData =
		stats?.map((cat) => ({
			name: cat.category_name,
			value: parseFloat(cat.total) || 0,
			color: cat.category_color || COLORS[0],
		})) || [];

	const barData =
		stats?.slice(0, 5).map((cat) => ({
			name:
				cat.category_name.length > 10
					? cat.category_name.slice(0, 10) + "..."
					: cat.category_name,
			value: parseFloat(cat.total) || 0,
			fullName: cat.category_name,
		})) || [];

	const chartData = trendData.map((d) => ({
		date: d.date,
		income: parseFloat(d.income) || 0,
		expense: parseFloat(d.expense) || 0,
	}));

	if (loading) {
		return (
			<div
				className="flex items-center justify-center h-64"
				role="status"
				aria-live="polite"
			>
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
				<span className="sr-only">Загрузка...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
						<BarChart className="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-secondary">Аналитика</h1>
						<p className="text-slate-500 text-sm">
							Детальный анализ ваших финансов
						</p>
					</div>
				</div>

				<div
					className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200"
					role="tablist"
					aria-label="Период"
				>
					{["week", "month", "year"].map((p) => (
						<button
							key={p}
							role="tab"
							aria-selected={period === p}
							onClick={() => setPeriod(p)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								period === p
									? "bg-primary text-white"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							{p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Год"}
						</button>
					))}
				</div>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm text-slate-500">Всего расходов</span>
						<div
							className={`flex items-center gap-1 text-sm ${
								expenseTrend.direction === "down"
									? "text-success"
									: expenseTrend.direction === "up"
										? "text-danger"
										: "text-slate-500"
							}`}
						>
							{getTrendIcon(expenseTrend.direction)}
							{expenseTrend.value}%
						</div>
					</div>
					<p className="text-2xl font-bold text-secondary">
						{formatCurrency(totalExpense)}
					</p>
					<p className="text-xs text-slate-400 mt-1">сравнение с прошлым периодом</p>
				</div>

				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
					<div className="flex items-center gap-2 mb-3">
						<div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
							<PiggyBank className="w-4 h-4 text-success" />
						</div>
						<span className="text-sm text-slate-500">Доходы</span>
					</div>
					<p className="text-2xl font-bold text-secondary">
						{formatCurrency(totalIncome)}
					</p>
					<p className="text-xs text-slate-400 mt-1">за период</p>
				</div>

				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
					<div className="flex items-center gap-2 mb-3">
						<div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
							<Target className="w-4 h-4 text-accent" />
						</div>
						<span className="text-sm text-slate-500">Средний расход</span>
					</div>
					<p className="text-2xl font-bold text-secondary">
						{formatCurrency(totalExpense / (stats?.length || 1))}
					</p>
					<p className="text-xs text-slate-400 mt-1">на категорию</p>
				</div>

				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
					<div className="flex items-center gap-2 mb-3">
						<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
							<Calendar className="w-4 h-4 text-primary" />
						</div>
						<span className="text-sm text-slate-500">Категорий</span>
					</div>
					<p className="text-2xl font-bold text-secondary">
						{stats?.length || 0}
					</p>
					<p className="text-xs text-slate-400 mt-1">с расходами</p>
				</div>
			</div>

			{/* Line Chart - Trend */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
				<div className="flex items-center justify-between mb-4 flex-wrap gap-3">
					<h2 className="text-lg font-semibold text-secondary">
						Динамика доходов и расходов
					</h2>
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-success" />
							<span className="text-slate-600">Доходы</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-danger" />
							<span className="text-slate-600">Расходы</span>
						</div>
					</div>
				</div>
				{chartData.length > 0 ? (
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="date" tick={{ fontSize: 12 }} />
								<YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
								<Tooltip
									formatter={(value) => formatCurrency(value)}
									contentStyle={{
										backgroundColor: "white",
										border: "1px solid #e2e8f0",
										borderRadius: "12px",
									}}
								/>
								<Line
									type="monotone"
									dataKey="income"
									stroke="#10b981"
									strokeWidth={2}
									dot={{ fill: "#10b981", strokeWidth: 2 }}
								/>
								<Line
									type="monotone"
									dataKey="expense"
									stroke="#ef4444"
									strokeWidth={2}
									dot={{ fill: "#ef4444", strokeWidth: 2 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				) : (
					<div className="h-72 flex items-center justify-center text-slate-400">
						<p>Нет данных для отображения</p>
					</div>
				)}
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Pie Chart */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<h2 className="text-lg font-semibold text-secondary mb-4">
						Структура расходов
					</h2>
					{stats?.length > 0 ? (
						<>
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={pieData}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={100}
											paddingAngle={2}
											dataKey="value"
										>
											{pieData.map((entry, index) => (
												<Cell key={index} fill={entry.color} />
											))}
										</Pie>
										<Tooltip
											formatter={(value) => formatCurrency(value)}
											contentStyle={{
												backgroundColor: "white",
												border: "1px solid #e2e8f0",
												borderRadius: "12px",
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="flex flex-wrap gap-3 mt-4 justify-center">
								{stats?.slice(0, 6).map((cat, i) => (
									<div key={i} className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{
												backgroundColor:
													cat.category_color || COLORS[i % COLORS.length],
											}}
										/>
										<span className="text-sm text-slate-600">
											{cat.category_name}
										</span>
									</div>
								))}
							</div>
						</>
					) : (
						<div className="h-64 flex items-center justify-center text-slate-400">
							<p>Нет данных для отображения</p>
						</div>
					)}
				</div>

				{/* Bar Chart */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<h2 className="text-lg font-semibold text-secondary mb-4">
						Топ категорий
					</h2>
					{stats?.length > 0 ? (
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={barData} layout="vertical">
									<CartesianGrid strokeDasharray="3 3" horizontal={false} />
									<XAxis
										type="number"
										tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
									/>
									<YAxis
										type="category"
										dataKey="name"
										tick={{ fontSize: 12 }}
										width={80}
									/>
									<Tooltip
										formatter={(value) => formatCurrency(value)}
										labelFormatter={(label) =>
											barData.find((b) => b.name === label)?.fullName || label
										}
										contentStyle={{
											backgroundColor: "white",
											border: "1px solid #e2e8f0",
											borderRadius: "12px",
										}}
									/>
									<Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<div className="h-64 flex items-center justify-center text-slate-400">
							<p>Нет данных для отображения</p>
						</div>
					)}
				</div>
			</div>

			{/* Category details */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
				<h2 className="text-lg font-semibold text-secondary mb-4">
					Детали по категориям
				</h2>
				{stats?.length > 0 ? (
					<div className="space-y-3">
						{stats.map((cat, index) => {
							const percentage =
								totalExpense > 0
									? ((parseFloat(cat.total) || 0) / totalExpense) * 100
									: 0;
							return (
								<div key={index} className="flex items-center gap-4">
									<div
										className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
										style={{
											backgroundColor:
												cat.category_color || COLORS[index % COLORS.length],
										}}
									>
										{index + 1}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-1">
											<span className="font-medium text-secondary">
												{cat.category_name}
											</span>
											<span className="text-sm text-slate-500">
												{formatCurrency(parseFloat(cat.total))}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="flex-1 bg-slate-100 rounded-full h-2">
												<div
													className="h-2 rounded-full transition-all"
													style={{
														width: `${percentage}%`,
														backgroundColor:
															cat.category_color || COLORS[index % COLORS.length],
													}}
												/>
											</div>
											<span className="text-xs text-slate-500 w-12 text-right">
												{percentage.toFixed(1)}%
											</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="text-center text-slate-400 py-8">
						<p>Нет данных</p>
					</div>
				)}
			</div>

			{/* Tips */}
			<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
				<h2 className="text-lg font-semibold text-secondary mb-4">
					💡 Рекомендации
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{stats?.[0] && (
						<div className="bg-white/80 rounded-xl p-4">
							<div className="flex items-center gap-2 mb-2">
								<TrendingDown className="w-5 h-5 text-danger" />
								<span className="font-medium text-secondary">
									Самые большие расходы
								</span>
							</div>
							<p className="text-sm text-slate-600">
								{stats[0].category_name} —{" "}
								{formatCurrency(parseFloat(stats[0].total))}
							</p>
						</div>
					)}
					<div className="bg-white/80 rounded-xl p-4">
						<div className="flex items-center gap-2 mb-2">
							<PiggyBank className="w-5 h-5 text-success" />
							<span className="font-medium text-secondary">Накопления</span>
						</div>
						<p className="text-sm text-slate-600">
							Рекомендуем откладывать 20% от доходов ежемесячно
						</p>
					</div>
					<div className="bg-white/80 rounded-xl p-4">
						<div className="flex items-center gap-2 mb-2">
							<Target className="w-5 h-5 text-primary" />
							<span className="font-medium text-secondary">Цель</span>
						</div>
						<p className="text-sm text-slate-600">
							Сократите расходы на 10% в следующем месяце
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
