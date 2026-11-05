import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
	LayoutDashboard,
	Receipt,
	PlusCircle,
	BarChart3,
	Tags,
	Calculator,
	PieChart,
	Bell,
	ChevronsLeft,
	ChevronsRight,
	LogOut,
	Menu,
	X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
	{ path: "/", icon: LayoutDashboard, label: "Главная" },
	{ path: "/transactions", icon: Receipt, label: "Транзакции" },
	{ path: "/add", icon: PlusCircle, label: "Добавить" },
	{ path: "/analytics", icon: BarChart3, label: "Аналитика" },
	{ path: "/reports", icon: PieChart, label: "Отчёты" },
	{ path: "/categories", icon: Tags, label: "Категории" },
	{ path: "/calculator", icon: Calculator, label: "Калькулятор" },
];

function initials(name) {
	if (!name) return "?";
	return name
		.trim()
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export default function Layout({ children }) {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(() => {
		return localStorage.getItem("sidebar-collapsed") === "1";
	});
	const [notifications] = useState(1); // placeholder; backend notifications not in SPEC

	useEffect(() => {
		localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
	}, [collapsed]);

	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const isActive = (path) => {
		if (path === "/") return location.pathname === "/";
		return (
			location.pathname === path || location.pathname.startsWith(path + "/")
		);
	};

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Mobile header */}
			<header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
				<button
					onClick={() => setMobileOpen(true)}
					className="p-2 rounded-lg hover:bg-slate-100 transition-all"
					aria-label="Открыть меню"
				>
					<Menu className="w-6 h-6 text-slate-600" />
				</button>
				<span className="font-bold text-secondary">Личные финансы</span>
				<button
					onClick={() => setMobileOpen(false)}
					className="p-2 rounded-lg hover:bg-slate-100 transition-all invisible w-10"
					aria-hidden="true"
					tabIndex={-1}
				>
					<Menu className="w-6 h-6" />
				</button>
			</header>

			{/* Mobile overlay */}
			{mobileOpen && (
				<div className="fixed inset-0 z-50 lg:hidden">
					<div
						className="absolute inset-0 bg-secondary/50"
						onClick={() => setMobileOpen(false)}
						aria-hidden="true"
					/>
					<aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-slate-100 flex flex-col">
						<div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
							<span className="font-bold text-secondary">Личные финансы</span>
							<button
								onClick={() => setMobileOpen(false)}
								className="p-2 rounded-lg hover:bg-slate-100 transition-all"
								aria-label="Закрыть меню"
							>
								<X className="w-5 h-5 text-slate-600" />
							</button>
						</div>
						<nav className="flex-1 p-3 space-y-1 overflow-y-auto">
							{NAV_ITEMS.map((item) => (
								<MobileLink
									key={item.path}
									item={item}
									active={isActive(item.path)}
									onClose={() => setMobileOpen(false)}
								/>
							))}
						</nav>
						<div className="p-4 border-t border-slate-100">
							<button
								onClick={handleLogout}
								className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-danger/10 hover:text-danger transition-all"
							>
								<LogOut className="w-5 h-5" />
								Выйти
							</button>
						</div>
					</aside>
				</div>
			)}

			{/* Desktop sidebar */}
			<aside
				className={`hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white border-r border-slate-100 transition-all duration-300 ${
					collapsed ? "w-20" : "w-64"
				}`}
			>
				<div
					className={`h-16 flex items-center border-b border-slate-100 px-4 ${
						collapsed ? "justify-center" : "justify-between"
					}`}
				>
					{!collapsed && (
						<span className="font-bold text-secondary">Личные финансы</span>
					)}
					{collapsed && (
						<span
							className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold"
							aria-hidden="true"
						>
							ЛФ
						</span>
					)}
				</div>

				<nav className="flex-1 p-3 space-y-1 overflow-y-auto">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const active = isActive(item.path);
						return (
							<Link
								key={item.path}
								to={item.path}
								title={collapsed ? item.label : undefined}
								aria-label={item.label}
								className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all ${
									collapsed ? "justify-center" : ""
								} ${
									active
										? "bg-primary text-white shadow-lg shadow-primary/25"
										: "text-slate-500 hover:bg-slate-100 hover:text-secondary"
								}`}
							>
								<Icon className="w-5 h-5 shrink-0" />
								{!collapsed && <span>{item.label}</span>}
							</Link>
						);
					})}
				</nav>

				<div
					className={`p-4 border-t border-slate-100 ${
						collapsed ? "flex flex-col items-center gap-3" : ""
					}`}
				>
					<div
						className={`flex items-center ${
							collapsed ? "justify-center" : "gap-3"
						}`}
					>
						<span
							className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold shrink-0"
							aria-hidden="true"
						>
							{initials(user?.name)}
						</span>
						{!collapsed && (
							<span className="min-w-0">
								<span className="block font-medium text-secondary truncate">
									{user?.name}
								</span>
								<span className="block text-xs text-slate-500 truncate">
									{user?.email}
								</span>
							</span>
						)}
					</div>
					{!collapsed && (
						<button
							onClick={handleLogout}
							className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-danger/10 hover:text-danger transition-all"
						>
							<LogOut className="w-5 h-5" />
							Выйти
						</button>
					)}
				</div>
			</aside>

			{/* Main */}
			<div
				className={`transition-all duration-300 ${
					collapsed ? "lg:ml-20" : "lg:ml-64"
				}`}
			>
				{/* Desktop header */}
				<header className="hidden lg:flex sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 h-16 items-center justify-between px-6">
					<button
						onClick={() => setCollapsed((v) => !v)}
						className="p-2 rounded-lg hover:bg-slate-100 transition-all"
						aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
					>
						{collapsed ? (
							<ChevronsRight className="w-5 h-5 text-slate-600" />
						) : (
							<ChevronsLeft className="w-5 h-5 text-slate-600" />
						)}
					</button>

					<div className="flex items-center gap-2">
						<button
							className="relative p-2 rounded-lg hover:bg-slate-100 transition-all"
							aria-label="Уведомления"
						>
							<Bell className="w-5 h-5 text-slate-600" />
							{notifications > 0 && (
								<span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-white" />
							)}
						</button>
						<span
							className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold"
							aria-hidden="true"
						>
							{initials(user?.name)}
						</span>
					</div>
				</header>

				<main className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">{children}</main>
			</div>
		</div>
	);
}

function MobileLink({ item, active, onClose }) {
	const Icon = item.icon;
	return (
		<Link
			to={item.path}
			onClick={onClose}
			aria-label={item.label}
			className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
				active
					? "bg-primary text-white shadow-lg shadow-primary/25"
					: "text-slate-500 hover:bg-slate-100 hover:text-secondary"
			}`}
		>
			<Icon className="w-5 h-5 shrink-0" />
			<span>{item.label}</span>
		</Link>
	);
}
