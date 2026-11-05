import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Transactions from "./pages/Transactions";
import AddTransaction from "./pages/AddTransaction";
import Categories from "./pages/Categories";
import Calculator from "./pages/Calculator";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import ResetPassword from "./pages/ResetPassword";

function ProtectedRoute({ children }) {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return children;
}

function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center h-64 text-slate-500">
			<h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
			<p className="mb-4">Страница не найдена</p>
			<Link
				to="/"
				className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all"
			>
				На главную
			</Link>
		</div>
	);
}

function PWAPrompt() {
	const [showPrompt, setShowPrompt] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState(null);

	useEffect(() => {
		const handler = (e) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setShowPrompt(true);
		};

		window.addEventListener("beforeinstallprompt", handler);

		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	const handleInstall = () => {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then(() => {
				setDeferredPrompt(null);
				setShowPrompt(false);
			});
		}
	};

	if (!showPrompt) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl p-4 z-50 border border-slate-200">
			<div className="flex items-start gap-3">
				<div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center flex-shrink-0">
					<svg
						className="w-6 h-6 text-white"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
				</div>
				<div className="flex-1">
					<h3 className="font-semibold text-slate-800">
						Установить приложение
					</h3>
					<p className="text-sm text-slate-500 mt-1">
						Быстрый доступ с главного экрана
					</p>
					<div className="flex gap-2 mt-3">
						<button
							onClick={handleInstall}
							className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
						>
							Установить
						</button>
						<button
							onClick={() => setShowPrompt(false)}
							className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
						>
							Позже
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function AppRoutes() {
	const { user } = useAuth();

	return (
		<>
			<Routes>
				<Route
					path="/login"
					element={user ? <Navigate to="/" replace /> : <Login />}
				/>
				<Route
					path="/register"
					element={user ? <Navigate to="/" replace /> : <Register />}
				/>
				<Route
					path="/forgot-password"
					element={user ? <Navigate to="/" replace /> : <ResetPassword />}
				/>
				<Route
					path="/reset-password"
					element={user ? <Navigate to="/" replace /> : <ResetPassword />}
				/>
				<Route
					path="/*"
					element={
						<ProtectedRoute>
							<Layout>
								<Routes>
									<Route path="/" element={<Dashboard />} />
									<Route path="/transactions" element={<Transactions />} />
									<Route path="/add" element={<AddTransaction />} />
									<Route path="/add/:type" element={<AddTransaction />} />
									<Route path="/categories" element={<Categories />} />
									<Route path="/calculator" element={<Calculator />} />
									<Route path="/analytics" element={<Analytics />} />
									<Route path="/reports" element={<Reports />} />
									<Route path="*" element={<NotFound />} />
								</Routes>
							</Layout>
						</ProtectedRoute>
					}
				/>
			</Routes>
			<PWAPrompt />
		</>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<AppRoutes />
			</AuthProvider>
		</BrowserRouter>
	);
}
