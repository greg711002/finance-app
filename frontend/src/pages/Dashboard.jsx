import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import api from "../api";
import {
	TrendingUp,
	TrendingDown,
	Wallet,
	PlusCircle,
	ArrowUpRight,
	ArrowDownRight,
	Clock,
} from "lucide-react";

// SVG Illustration Components
const HeroIllustration = () => (
	<svg
		viewBox="0 0 400 200"
		className="w-full h-auto"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		{/* Background shapes */}
		<circle cx="320" cy="40" r="60" fill="#dbeafe" opacity="0.6" />
		<circle cx="80" cy="160" r="40" fill="#dcfce7" opacity="0.6" />
		<circle cx="350" cy="150" r="30" fill="#fef3c7" opacity="0.6" />

		{/* Main wallet */}
		<rect x="140" y="60" width="120" height="80" rx="12" fill="#2563eb" />
		<rect x="140" y="60" width="120" height="40" rx="12" fill="#1d4ed8" />
		<circle cx="200" cy="80" r="15" fill="#60a5fa" opacity="0.5" />
		<rect x="175" y="110" width="50" height="8" rx="4" fill="#93c5fd" />
		<rect x="185" y="122" width="30" height="6" rx="3" fill="#93c5fd" />

		{/* Floating coins */}
		<circle cx="100" cy="70" r="20" fill="#fbbf24" />
		<circle cx="100" cy="70" r="14" fill="#f59e0b" />
		<text
			x="100"
			y="75"
			textAnchor="middle"
			fill="#fff"
			fontSize="12"
			fontWeight="bold"
		>
			₽
		</text>

		<circle cx="300" cy="100" r="18" fill="#10b981" />
		<circle cx="300" cy="100" r="12" fill="#059669" />
		<text
			x="300"
			y="105"
			textAnchor="middle"
			fill="#fff"
			fontSize="10"
			fontWeight="bold"
		>
			+
		</text>

		<circle cx="320" cy="130" r="14" fill="#ef4444" />
		<circle cx="320" cy="130" r="9" fill="#dc2626" />
		<text
			x="320"
			y="134"
			textAnchor="middle"
			fill="#fff"
			fontSize="8"
			fontWeight="bold"
		>
			-
		</text>

		{/* Chart bars */}
		<rect
			x="50"
			y="140"
			width="20"
			height="40"
			rx="4"
			fill="#6366f1"
			opacity="0.8"
		/>
		<rect
			x="80"
			y="120"
			width="20"
			height="60"
			rx="4"
			fill="#8b5cf6"
			opacity="0.8"
		/>
		<rect
			x="110"
			y="130"
			width="20"
			height="50"
			rx="4"
			fill="#a78bfa"
			opacity="0.8"
		/>

		{/* Credit card */}
		<rect x="250" y="120" width="80" height="50" rx="8" fill="#0f172a" />
		<rect x="260" y="135" width="40" height="4" rx="2" fill="#475569" />
		<rect x="260" y="145" width="25" height="4" rx="2" fill="#64748b" />
		<circle cx="310" cy="155" r="8" fill="#fbbf24" opacity="0.8" />
		<circle cx="318" cy="155" r="8" fill="#ef4444" opacity="0.6" />

		{/* Growth arrow */}
		<path
			d="M150 170 L180 150 L210 160 L240 130"
			stroke="#10b981"
			strokeWidth="3"
			strokeLinecap="round"
			fill="none"
		/>
		<circle cx="240" cy="130" r="6" fill="#10b981" />
	</svg>
);

const CategoryIllustration = ({ color, delay = 0 }) => (
	<svg
		viewBox="0 0 80 80"
		className="w-20 h-20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<circle cx="40" cy="40" r="35" fill={color} opacity="0.15" />
		<circle cx="40" cy="40" r="25" fill={color} opacity="0.25" />
		<circle cx="40" cy="40" r="15" fill={color} />
	</svg>
);

const EmptyStateIllustration = () => (
	<svg
		viewBox="0 0 200 150"
		className="w-32 h-24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		{/* Empty wallet */}
		<rect x="40" y="30" width="120" height="80" rx="12" fill="#e2e8f0" />
		<rect x="40" y="30" width="120" height="40" rx="12" fill="#cbd5e1" />
		<path
			d="M80 60 L100 75 L120 55 L140 70"
			stroke="#94a3b8"
			strokeWidth="3"
			strokeLinecap="round"
			strokeLinejoin="round"
			fill="none"
		/>

		{/* Sparkles */}
		<circle cx="30" cy="30" r="3" fill="#fbbf24" />
		<circle cx="170" cy="40" r="2" fill="#60a5fa" />
		<circle cx="160" cy="20" r="2" fill="#a78bfa" />

		{/* Arrow down */}
		<circle cx="100" cy="110" r="15" fill="#dbeafe" />
		<path
			d="M100 100 L100 115 M95 110 L100 115 L105 110"
			stroke="#2563eb"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			fill="none"
		/>
	</svg>
);

const TransactionTypeIllustration = ({ type, amount }) => {
	if (type === "income") {
		return (
			<svg
				viewBox="0 0 40 40"
				className="w-10 h-10"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="20" cy="20" r="18" fill="#dcfce7" />
				<path
					d="M20 10 L20 30 M12 18 L20 10 L28 18"
					stroke="#10b981"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
				/>
			</svg>
		);
	}
	return (
		<svg
			viewBox="0 0 40 40"
			className="w-10 h-10"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="20" cy="20" r="18" fill="#fee2e2" />
			<path
				d="M20 30 L20 10 M12 22 L20 30 L28 22"
				stroke="#ef4444"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</svg>
	);
};

const ICONS = {
	wallet: Wallet,
	briefcase: TrendingUp,
	laptop: TrendingUp,
	"trending-up": TrendingUp,
	"shopping-cart": ShoppingCart,
	car: Car,
	home: Home,
	film: Film,
	heart: Heart,
	shirt: Shirt,
	book: Book,
};

function ShoppingCart(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="8" cy="21" r="1" />
			<circle cx="19" cy="21" r="1" />
			<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
		</svg>
	);
}
function Car(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
			<circle cx="7" cy="17" r="2" />
			<path d="M9 17h6" />
			<circle cx="17" cy="17" r="2" />
		</svg>
	);
}
function Home(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	);
}
function Film(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M7 3v18" />
			<path d="M3 7.5h4" />
			<path d="M3 12h18" />
			<path d="M3 16.5h4" />
			<path d="M17 3v18" />
			<path d="M17 7.5h4" />
			<path d="M17 16.5h4" />
		</svg>
	);
}
function Heart(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
		</svg>
	);
}
function Shirt(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
		</svg>
	);
}
function Book(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={props.size || 24}
			height={props.size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
		</svg>
	);
}

export default function Dashboard() {
	const [stats, setStats] = useState(null);
	const [trend, setTrend] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadStats();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadStats = async () => {
		try {
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 29);
			const fmt = (d) => d.toISOString().slice(0, 10);
			const [res, trendRes] = await Promise.all([
				api.get("/stats/dashboard"),
				api.get(`/stats/by-period?start=${fmt(start)}&end=${fmt(end)}`),
			]);
			setStats(res.data);
			setTrend(trendRes.data || []);
		} catch (err) {
			console.error("Failed to load stats", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		);
	}

	const formatCurrency = (value) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			minimumFractionDigits: 0,
		}).format(value);
	};

	return (
		<div className="space-y-6">
			{/* Hero Section with Illustration */}
			<div className="bg-gradient-to-br from-primary via-blue-600 to-blue-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
					<div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
				</div>
				<div className="grid md:grid-cols-2 gap-6 items-center relative z-10">
					<div>
						<h1 className="text-3xl md:text-4xl font-bold mb-3">
							Управляйте финансами
						</h1>
						<p className="text-blue-100 text-lg mb-4">
							Отслеживайте доходы и расходы в одном месте
						</p>
						<div className="flex flex-wrap gap-3">
							<Link
								to="/add"
								className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
							>
								<PlusCircle className="w-5 h-5" />
								Добавить операцию
							</Link>
							<Link
								to="/transactions"
								className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-all"
							>
								Все транзакции
							</Link>
						</div>
					</div>
					<div className="hidden md:block">
						<HeroIllustration />
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between mt-8">
				<div>
					<h2 className="text-2xl font-bold text-slate-800">Главная</h2>
					<p className="text-slate-500 mt-1">
						Обзор ваших финансов за{" "}
						{format(new Date(), "MMMM yyyy", { locale: ru })}
					</p>
				</div>
				<Link
					to="/add"
					className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/25"
				>
					<PlusCircle className="w-5 h-5" />
					Добавить
				</Link>
			</div>

			{/* Balance cards with illustrations */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
					<div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<CategoryIllustration color="#64748b" />
					</div>
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
							<Wallet className="w-6 h-6 text-slate-600" />
						</div>
						<span className="text-slate-500 font-medium">Баланс</span>
					</div>
					<p
						className={`text-2xl font-bold ${stats?.total_balance >= 0 ? "text-slate-800" : "text-red-600"}`}
					>
						{formatCurrency(stats?.total_balance || 0)}
					</p>
				</div>

				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
					<div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<CategoryIllustration color="#10b981" />
					</div>
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
							<TrendingUp className="w-6 h-6 text-green-600" />
						</div>
						<span className="text-slate-500 font-medium">Доходы</span>
					</div>
					<p className="text-2xl font-bold text-green-600">
						{formatCurrency(stats?.total_income || 0)}
					</p>
				</div>

				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
					<div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<CategoryIllustration color="#ef4444" />
					</div>
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
							<TrendingDown className="w-6 h-6 text-red-600" />
						</div>
						<span className="text-slate-500 font-medium">Расходы</span>
					</div>
					<p className="text-2xl font-bold text-red-600">
						{formatCurrency(stats?.total_expense || 0)}
					</p>
				</div>
			</div>

			{/* Income/Expense dynamics */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
				<h2 className="text-lg font-semibold text-slate-800 mb-6">
					Динамика доходов и расходов
				</h2>
				{trend?.length > 0 ? (
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={trend}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(d) =>
										format(new Date(d), "d MMM", { locale: ru })
									}
									tick={{ fontSize: 12 }}
								/>
								<YAxis tick={{ fontSize: 12 }} />
								<Tooltip
									formatter={(value) => formatCurrency(value)}
									labelFormatter={(d) =>
										format(new Date(d), "d MMM", { locale: ru })
									}
									contentStyle={{
										backgroundColor: "white",
										border: "1px solid #e2e8f0",
										borderRadius: "12px",
										boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
									}}
								/>
								<Line
									type="monotone"
									dataKey="income"
									name="Доходы"
									stroke="#10b981"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									type="monotone"
									dataKey="expense"
									name="Расходы"
									stroke="#ef4444"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ResponsiveContainer>
						<div className="flex gap-4 justify-center mt-4">
							<span className="flex items-center gap-2 text-sm text-slate-600">
								<span className="w-3 h-3 rounded-full bg-[#10b981]" /> Доходы
							</span>
							<span className="flex items-center gap-2 text-sm text-slate-600">
								<span className="w-3 h-3 rounded-full bg-[#ef4444]" /> Расходы
							</span>
						</div>
					</div>
				) : (
					<div className="h-64 flex items-center justify-center text-slate-400">
						<p>Нет данных о динамике</p>
					</div>
				)}
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Expenses chart */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<h2 className="text-lg font-semibold text-slate-800 mb-6">
						Расходы по категориям
					</h2>
					{stats?.expenses_by_category?.length > 0 ? (
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={stats.expenses_by_category}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										innerRadius={60}
										outerRadius={100}
										paddingAngle={2}
									>
										{stats.expenses_by_category.map((entry, index) => (
											<Cell key={index} fill={entry.color} />
										))}
									</Pie>
									<Tooltip
										formatter={(value) => formatCurrency(value)}
										contentStyle={{
											backgroundColor: "white",
											border: "1px solid #e2e8f0",
											borderRadius: "12px",
											boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
							<div className="flex flex-wrap gap-3 mt-4 justify-center">
								{stats.expenses_by_category.map((cat, i) => (
									<div key={i} className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: cat.color }}
										/>
										<span className="text-sm text-slate-600">{cat.name}</span>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="h-64 flex items-center justify-center text-slate-400">
							<p>Нет данных о расходах</p>
						</div>
					)}
				</div>

				{/* Recent transactions */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-lg font-semibold text-slate-800">
							Последние операции
						</h2>
						<Link
							to="/transactions"
							className="text-primary text-sm font-medium hover:underline"
						>
							Все →
						</Link>
					</div>
					{stats?.recent_transactions?.length > 0 ? (
						<div className="space-y-4">
							{stats.recent_transactions.slice(0, 5).map((tx) => {
								const IconComponent = ICONS[tx.category_icon] || Wallet;
								const isIncome =
									tx.type === "income" ||
									(tx.type == null &&
										["Зарплата", "Фриланс", "Инвестиции"].includes(
											tx.category_name,
										));
								const txType = isIncome ? "income" : "expense";
								return (
									<div key={tx.id} className="flex items-center gap-4 group">
										<TransactionTypeIllustration
											type={txType}
											amount={tx.amount}
										/>
										<div
											className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
											style={{ backgroundColor: `${tx.category_color}20` }}
										>
											<IconComponent
												size={20}
												style={{ color: tx.category_color }}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-800 truncate">
												{tx.description || tx.category_name}
											</p>
											<p className="text-sm text-slate-500">
												{format(new Date(tx.date), "d MMM, HH:mm", {
													locale: ru,
												})}
											</p>
										</div>
										<div
											className={`flex items-center gap-1 font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}
										>
											{isIncome ? (
												<ArrowUpRight className="w-4 h-4" />
											) : (
												<ArrowDownRight className="w-4 h-4" />
											)}
											{isIncome ? "+" : "-"}
											{formatCurrency(Math.abs(tx.amount))}
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="h-48 flex flex-col items-center justify-center text-slate-400">
							<EmptyStateIllustration />
							<p className="mt-4 font-medium">Нет транзакций</p>
							<Link
								to="/add"
								className="text-primary text-sm mt-2 hover:underline"
							>
								Добавить первую →
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
