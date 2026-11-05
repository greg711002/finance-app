import { useState, useEffect, useMemo } from "react";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import {
	Calendar,
	TrendingUp,
	TrendingDown,
	ArrowUpRight,
	ArrowDownRight,
	PiggyBank,
	Target,
} from "lucide-react";
import { format, subMonths, subYears, subWeeks } from "date-fns";
import api from "../api";

const COLORS = [
	"#2563eb",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
	"#f97316",
	"#06b6d4",
	"#6366f1",
];

const PERIODS = [
	{ value: "week", label: "Неделя" },
	{ value: "month", label: "Месяц" },
	{ value: "year", label: "Год" },
	{ value: "custom", label: "Произвольный" },
];

const BACKEND_PERIODS = { week: "week", month: "month", year: "year" };

function toLocalISO(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function periodRange(period) {
	const today = new Date();
	switch (period) {
		case "week":
			return { start: subWeeks(today, 1), end: today };
		case "month":
			return { start: subMonths(today, 1), end: today };
		case "year":
			return { start: subYears(today, 1), end: today };
		default:
			return { start: subMonths(today, 1), end: today };
	}
}

function shiftToPrevious({ start, end }) {
	const ms = end.getTime() - start.getTime();
	return { start: new Date(start.getTime() - ms), end: new Date(start.getTime()) };
}

function sumField(arr, field) {
	return (arr || []).reduce((acc, it) => acc + (Number(it[field]) || 0), 0);
}

function formatCurrency(v) {
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(v || 0);
}

function fmtPct(v) {
	return `${Math.abs(v).toFixed(1)}%`;
}

export default function Reports() {
	const [period, setPeriod] = useState("month");
	const [customStart, setCustomStart] = useState(
		toLocalISO(subMonths(new Date(), 1)),
	);
	const [customEnd, setCustomEnd] = useState(toLocalISO(new Date()));
	const [categories, setCategories] = useState([]);
	const [currentSeries, setCurrentSeries] = useState([]);
	const [previousSeries, setPreviousSeries] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const loadReports = async () => {
		setLoading(true);
		setError("");
		try {
			let current = periodRange(period === "custom" ? "month" : period);
			let byCategoryPeriod =
				period === "custom" ? "month" : BACKEND_PERIODS[period];

			if (period === "custom") {
				current = {
					start: new Date(customStart + "T00:00:00"),
					end: new Date(customEnd + "T00:00:00"),
				};
			}

			const previous = shiftToPrevious(current);

			const [catRes, curRes, prevRes] = await Promise.all([
				api.get(`/stats/by-category?period=${byCategoryPeriod}`),
				api.get(
					`/stats/by-period?start=${toLocalISO(current.start)}&end=${toLocalISO(
						current.end,
					)}`,
				),
				api.get(
					`/stats/by-period?start=${toLocalISO(
						previous.start,
					)}&end=${toLocalISO(previous.end)}`,
				),
			]);

			setCategories(catRes.data || []);
			setCurrentSeries(curRes.data || []);
			setPreviousSeries(prevRes.data || []);
		} catch (err) {
			setError("Не удалось загрузить отчёты");
			console.error("Failed to load reports", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadReports();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [period, customStart, customEnd]);

	const currentIncome = useMemo(
		() => sumField(currentSeries, "income"),
		[currentSeries],
	);
	const currentExpense = useMemo(
		() => sumField(currentSeries, "expense"),
		[currentSeries],
	);
	const prevIncome = useMemo(
		() => sumField(previousSeries, "income"),
		[previousSeries],
	);
	const prevExpense = useMemo(() => sumField(previousSeries, "expense"), [
		previousSeries,
	]);

	const expenseTrend =
		prevExpense > 0
			? ((currentExpense - prevExpense) / prevExpense) * 100
			: null;
	const incomeTrend =
		prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : null;

	const expenseCategories = useMemo(() => {
		const arr = (categories || [])
			.map((c) => ({
				name: c.category_name || "—",
				value: Number(c.total || 0),
				color: c.category_color,
			}))
			.filter((c) => c.value > 0)
			.sort((a, b) => b.value - a.value);
		return arr;
	}, [categories]);

	const topExpenses = expenseCategories.slice(0, 5);
	const totalCategorySum = expenseCategories.reduce((a, c) => a + c.value, 0);

	const trend = (v) => {
		if (v === null) return null;
		return v;
	};

	const TrendChip = ({ value, positive }) => {
		if (value === null)
			return <span className="text-slate-400 text-sm">нет данных</span>;
		const up = value > 0;
		const color = positive
			? value > 0
				? "text-success"
				: "text-danger"
			: value > 0
				? "text-danger"
				: "text-success";
		return (
			<span className={`inline-flex items-center gap-1 font-semibold ${color}`}>
				{up ? (
					<ArrowUpRight className="w-4 h-4" />
				) : (
					<ArrowDownRight className="w-4 h-4" />
				)}
				{fmtPct(value)}
			</span>
		);
	};

	const rangeLabel =
		period === "custom"
			? `${customStart} — ${customEnd}`
			: PERIODS.find((p) => p.value === period)?.label || "";

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-secondary">Отчёты</h1>
					<p className="text-slate-500 mt-1">
						Сравнение периодов и структура расходов
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex bg-white border border-slate-200 rounded-xl p-1">
						{PERIODS.map((p) => (
							<button
								key={p.value}
								type="button"
								onClick={() => setPeriod(p.value)}
								aria-pressed={period === p.value}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
									period === p.value
										? "bg-primary text-white shadow"
										: "text-slate-500 hover:text-secondary"
								}`}
							>
								{p.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{period === "custom" && (
				<div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<label
							htmlFor="rep-start"
							className="block text-sm font-medium text-slate-700 mb-1"
						>
							С
						</label>
						<input
							id="rep-start"
							type="date"
							value={customStart}
							onChange={(e) => setCustomStart(e.target.value)}
							className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
					</div>
					<div className="flex-1">
						<label
							htmlFor="rep-end"
							className="block text-sm font-medium text-slate-700 mb-1"
						>
							По
						</label>
						<input
							id="rep-end"
							type="date"
							value={customEnd}
							onChange={(e) => setCustomEnd(e.target.value)}
							className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
					</div>
				</div>
			)}

			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="animate-pulse h-32 bg-white rounded-2xl border border-slate-100"
						/>
					))}
				</div>
			) : error ? (
				<div
					className="p-4 rounded-2xl bg-danger/10 text-danger"
					role="alert"
				>
					{error}
				</div>
			) : (
				<>
					{/* Totals */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<StatCard
							icon={PiggyBank}
							label="Доходы"
							value={formatCurrency(currentIncome)}
							trend={trend(incomeTrend)}
							chip={<TrendChip value={incomeTrend} positive />}
						/>
						<StatCard
							icon={Target}
							label="Расходы"
							value={formatCurrency(currentExpense)}
							trend={trend(expenseTrend)}
							chip={<TrendChip value={expenseTrend} />}
						/>
						<StatCard
							icon={Calendar}
							label="Баланс"
							value={formatCurrency(currentIncome - currentExpense)}
							chip={
								<span className="text-slate-500 text-sm">
									{rangeLabel || ""}
								</span>
							}
						/>
					</div>

					{/* By category */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
							<h2 className="text-lg font-semibold text-secondary mb-4">
								Расходы по категориям
							</h2>
							{expenseCategories.length === 0 ? (
								<p className="text-slate-500 text-sm">Нет данных за период</p>
							) : (
								<>
									<div className="h-64">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={expenseCategories}
													dataKey="value"
													nameKey="name"
													cx="50%"
													cy="50%"
													innerRadius={55}
													outerRadius={85}
													paddingAngle={2}
												>
													{expenseCategories.map((entry, index) => (
														<Cell
															key={entry.name}
															fill={entry.color || COLORS[index % COLORS.length]}
														/>
													))}
												</Pie>
												<Tooltip
													formatter={(v) => formatCurrency(Number(v))}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									<ul className="mt-4 space-y-2">
										{expenseCategories.map((c, i) => (
											<li
												key={c.name}
												className="flex items-center gap-3 text-sm"
											>
												<span
													className="w-3 h-3 rounded-full shrink-0"
													style={{
														backgroundColor:
															c.color || COLORS[i % COLORS.length],
													}}
													aria-hidden="true"
												/>
												<span className="flex-1 text-slate-600 truncate">
													{c.name}
												</span>
												<span className="text-slate-500">
													{totalCategorySum > 0
														? `${Math.round(
																(c.value / totalCategorySum) * 100,
														  )}%`
														: "—"}
												</span>
												<span className="font-semibold text-secondary">
													{formatCurrency(c.value)}
												</span>
											</li>
										))}
									</ul>
								</>
							)}
						</div>

						{/* Top expenses */}
						<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
							<h2 className="text-lg font-semibold text-secondary mb-4">
								Топ расходов
							</h2>
							{topExpenses.length === 0 ? (
								<p className="text-slate-500 text-sm">Нет данных за период</p>
							) : (
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={topExpenses}
											layout="vertical"
											margin={{ left: 8, right: 24 }}
										>
											<CartesianGrid strokeDasharray="3 3" horizontal={false} />
											<XAxis type="number" hide />
											<YAxis
												type="category"
												dataKey="name"
												width={120}
												tick={{ fontSize: 12, fill: "#64748b" }}
											/>
											<Tooltip
												formatter={(v) => formatCurrency(Number(v))}
											/>
											<Bar
												dataKey="value"
												radius={[0, 6, 6, 0]}
												maxBarSize={24}
											>
												{topExpenses.map((entry, index) => (
													<Cell
														key={entry.name}
														fill={entry.color || COLORS[index % COLORS.length]}
													/>
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
							)}
						</div>
					</div>

					{/* Period compare */}
					<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
						<h2 className="text-lg font-semibold text-secondary mb-4">
							Сравнение с предыдущим периодом
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="p-4 rounded-xl bg-slate-50">
								<p className="text-sm text-slate-500">Текущий период</p>
								<div className="mt-2 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-slate-600">
											<TrendingUp className="w-4 h-4 inline mr-1 text-success" />
											Доходы
										</span>
										<span className="font-semibold text-secondary">
											{formatCurrency(currentIncome)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-600">
											<TrendingDown className="w-4 h-4 inline mr-1 text-danger" />
											Расходы
										</span>
										<span className="font-semibold text-secondary">
											{formatCurrency(currentExpense)}
										</span>
									</div>
								</div>
							</div>
							<div className="p-4 rounded-xl bg-slate-50">
								<p className="text-sm text-slate-500">Предыдущий период</p>
								<div className="mt-2 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-slate-600">
											<TrendingUp className="w-4 h-4 inline mr-1 text-success" />
											Доходы
										</span>
										<span className="font-semibold text-secondary">
											{formatCurrency(prevIncome)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-600">
											<TrendingDown className="w-4 h-4 inline mr-1 text-danger" />
											Расходы
										</span>
										<span className="font-semibold text-secondary">
											{formatCurrency(prevExpense)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function StatCard({ icon: Icon, label, value, chip }) {
	return (
		<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
			<div className="flex items-center justify-between">
				<span
					className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center"
					aria-hidden="true"
				>
					<Icon className="w-5 h-5 text-secondary" />
				</span>
				{chip}
			</div>
			<p className="mt-3 text-sm text-slate-500">{label}</p>
			<p className="text-xl font-bold text-secondary">{value}</p>
		</div>
	);
}
