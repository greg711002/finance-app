import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import api from "../api";
import {
	PlusCircle,
	Search,
	ArrowUpRight,
	ArrowDownRight,
	ChevronLeft,
	ChevronRight,
	Wallet,
	Briefcase,
	Laptop,
	TrendingUp,
	ShoppingCart,
	Car,
	Home,
	Film,
	Heart,
	Shirt,
	Book,
	Download,
} from "lucide-react";

const ICONS = {
	wallet: Wallet,
	briefcase: Briefcase,
	laptop: Laptop,
	"trending-up": TrendingUp,
	"shopping-cart": ShoppingCart,
	car: Car,
	home: Home,
	film: Film,
	heart: Heart,
	shirt: Shirt,
	book: Book,
};

const PAGE_SIZE = 20;

export default function Transactions() {
	const [transactions, setTransactions] = useState([]);
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [type, setType] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);
	const [exporting, setExporting] = useState(false);

	// Debounce search input (avoid a request on every keystroke)
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(0);
		}, 350);
		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		api
			.get("/categories")
			.then((res) => setCategories(res.data || []))
			.catch(() => setCategories([]));
	}, []);

	useEffect(() => {
		loadTransactions();
	}, [debouncedSearch, type, categoryId, dateFrom, dateTo, page]);

	const loadTransactions = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				limit: String(PAGE_SIZE),
				offset: String(page * PAGE_SIZE),
			});
			if (debouncedSearch) params.append("search", debouncedSearch);
			if (type) params.append("type", type);
			if (categoryId) params.append("category_id", categoryId);
			if (dateFrom) params.append("date_from", dateFrom);
			if (dateTo) params.append("date_to", dateTo);

			const res = await api.get(`/transactions?${params}`);
			setTransactions(Array.isArray(res.data) ? res.data : []);
			const totalHeader = parseInt(res.headers["x-total-count"], 10);
			setTotal(Number.isFinite(totalHeader) ? totalHeader : res.data.length);
		} catch (err) {
			console.error("Failed to load transactions", err);
			setTransactions([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	};

	const handleExport = async () => {
		try {
			setExporting(true);
			const res = await api.get("/transactions/export", {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "transactions.csv");
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to export transactions", err);
			alert("Не удалось экспортировать транзакции");
		} finally {
			setExporting(false);
		}
	};

	const formatCurrency = (value) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			minimumFractionDigits: 0,
		}).format(value);
	};

	const getIcon = (iconName) => {
		const Icon = ICONS[iconName];
		return Icon ? <Icon className="w-6 h-6" /> : "💰";
	};

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold text-secondary">Транзакции</h1>
					<p className="text-slate-500 mt-1">Все ваши операции</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handleExport}
						disabled={exporting}
						className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl transition-all hover:bg-slate-50 disabled:opacity-50"
					>
						<Download className="w-5 h-5" />
						{exporting ? "Экспорт..." : "CSV"}
					</button>
					<Link
						to="/add"
						className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/25"
					>
						<PlusCircle className="w-5 h-5" />
						Добавить
					</Link>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
						<input
							type="text"
							aria-label="Поиск по описанию"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Поиск по описанию..."
							className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
					</div>
					<select
						aria-label="Тип транзакции"
						value={type}
						onChange={(e) => {
							setType(e.target.value);
							setPage(0);
						}}
						className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
					>
						<option value="">Все типы</option>
						<option value="income">Доходы</option>
						<option value="expense">Расходы</option>
					</select>
					<select
						aria-label="Категория"
						value={categoryId}
						onChange={(e) => {
							setCategoryId(e.target.value);
							setPage(0);
						}}
						className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
					>
						<option value="">Все категории</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{cat.name}
							</option>
						))}
					</select>
				</div>
				<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
					<div className="flex items-center gap-2">
						<label className="text-sm text-slate-500" htmlFor="date-from">
							С
						</label>
						<input
							id="date-from"
							type="date"
							aria-label="Дата с"
							value={dateFrom}
							onChange={(e) => {
								setDateFrom(e.target.value);
								setPage(0);
							}}
							className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm text-slate-500" htmlFor="date-to">
							По
						</label>
						<input
							id="date-to"
							type="date"
							aria-label="Дата по"
							value={dateTo}
							onChange={(e) => {
								setDateTo(e.target.value);
								setPage(0);
							}}
							className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
					</div>
				</div>
			</div>

			{/* Transactions list */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
				{loading ? (
					<div
						className="flex items-center justify-center h-64"
						role="status"
						aria-live="polite"
					>
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
						<span className="sr-only">Загрузка...</span>
					</div>
				) : transactions.length > 0 ? (
					<>
						<div className="divide-y divide-slate-100">
							{transactions.map((tx) => {
								const isIncome =
									tx.type === "income" ||
									(tx.type == null &&
										["Зарплата", "Фриланс", "Инвестиции"].includes(
											tx.category_name,
										));
								const Icon = ICONS[tx.category_icon];
								return (
									<div
										key={tx.id}
										className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
									>
										<div
											className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
											style={{
												backgroundColor: tx.category_color
													? `${tx.category_color}20`
													: "#f1f5f9",
											}}
										>
											{Icon ? (
												<Icon className="w-6 h-6" />
											) : (
												"💰"
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-secondary truncate">
												{tx.description || tx.category_name || "Без категории"}
											</p>
											<p className="text-sm text-slate-500">
												{tx.category_name || "Без категории"} •{" "}
												{format(new Date(tx.date), "d MMM yyyy", {
													locale: ru,
												})}
											</p>
										</div>
										<div
											className={`flex items-center gap-1 font-semibold text-lg ${
												isIncome ? "text-success" : "text-danger"
											}`}
										>
											{isIncome ? (
												<ArrowUpRight className="w-5 h-5" />
											) : (
												<ArrowDownRight className="w-5 h-5" />
											)}
											{isIncome ? "+" : "-"}
											{formatCurrency(Math.abs(tx.amount))}
										</div>
									</div>
								);
							})}
						</div>

						{/* Pagination */}
						<div className="p-4 border-t border-slate-100 flex items-center justify-between">
							<button
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={page === 0}
								className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								<ChevronLeft className="w-5 h-5" />
								Назад
							</button>
							<span className="text-slate-500">
								Страница {page + 1} из {totalPages}
							</span>
							<button
								onClick={() => setPage((p) => p + 1)}
								disabled={page + 1 >= totalPages}
								className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								Вперёд
								<ChevronRight className="w-5 h-5" />
							</button>
						</div>
					</>
				) : (
					<div className="flex flex-col items-center justify-center h-64 text-slate-400">
						<Wallet className="w-16 h-16 mb-4 opacity-50" />
						<p className="text-lg">Нет транзакций</p>
						<Link to="/add" className="text-primary mt-2 hover:underline">
							Добавить первую →
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
