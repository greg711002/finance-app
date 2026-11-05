import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
	Mail,
	Lock,
	Key,
	ArrowRight,
	CheckCircle,
	AlertCircle,
	Loader,
} from "lucide-react";
import api from "../api";

export default function ResetPassword() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const token = searchParams.get("token");

	const [step, setStep] = useState(token ? "reset" : "request");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const timeoutRef = useRef(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	const handleRequestReset = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const res = await api.post("/auth/password-reset", { email });
			setSuccess(
				res.data.message || "Инструкции отправлены на ваш email",
			);
		} catch (err) {
			setError(err.response?.data?.detail || "Произошла ошибка");
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async (e) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Пароли не совпадают");
			return;
		}

		if (password.length < 6) {
			setError("Пароль должен быть минимум 6 символов");
			return;
		}

		setLoading(true);

		try {
			await api.post("/auth/password-reset/confirm", {
				token,
				new_password: password,
			});
			setSuccess("Пароль успешно изменён!");
			timeoutRef.current = setTimeout(() => navigate("/login"), 2000);
		} catch (err) {
			setError(err.response?.data?.detail || "Недействительный токен");
		} finally {
			setLoading(false);
		}
	};

	if (step === "request") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
				<div className="w-full max-w-md">
					<div className="text-center mb-8">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-4 shadow-lg shadow-primary/25">
							<Key className="w-8 h-8 text-white" />
						</div>
						<h1 className="text-2xl font-bold text-slate-800">
							Восстановление пароля
						</h1>
						<p className="text-slate-500 mt-2">
							Введите email для сброса пароля
						</p>
					</div>

					<div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8">
						{success ? (
							<div className="text-center">
								<div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
									<CheckCircle className="w-8 h-8 text-green-600" />
								</div>
								<h2 className="text-xl font-bold text-slate-800 mb-2">
									Письмо отправлено!
								</h2>
								<p className="text-slate-600 mb-4">{success}</p>
								<Link
									to="/login"
									className="inline-flex items-center gap-2 mt-6 text-primary font-medium hover:underline"
								>
									Вернуться ко входу
								</Link>
							</div>
						) : (
							<form onSubmit={handleRequestReset} className="space-y-5">
								{error && (
									<div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
										<AlertCircle className="w-4 h-4 flex-shrink-0" />
										{error}
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">
										Email
									</label>
									<div className="relative">
										<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
										<input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
											placeholder="your@email.com"
											required
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={loading}
									className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
								>
									{loading ? (
										<Loader className="w-5 h-5 animate-spin" />
									) : (
										<>
											Восстановить пароль
											<ArrowRight className="w-5 h-5" />
										</>
									)}
								</button>
							</form>
						)}

						<div className="mt-6 text-center">
							<Link
								to="/login"
								className="text-slate-500 hover:text-slate-700 text-sm"
							>
								Вспомнили пароль? Войти
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Reset password form
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-4 shadow-lg shadow-primary/25">
						<Lock className="w-8 h-8 text-white" />
					</div>
					<h1 className="text-2xl font-bold text-slate-800">Новый пароль</h1>
					<p className="text-slate-500 mt-2">Введите новый пароль</p>
				</div>

				<div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8">
					{success ? (
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
								<CheckCircle className="w-8 h-8 text-green-600" />
							</div>
							<h2 className="text-xl font-bold text-slate-800 mb-2">
								Пароль изменён!
							</h2>
							<p className="text-slate-600 mb-4">
								Теперь вы можете войти с новым паролем
							</p>
							<Link
								to="/login"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all"
							>
								Войти
							</Link>
						</div>
					) : (
						<form onSubmit={handleResetPassword} className="space-y-5">
							{error && (
								<div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
									<AlertCircle className="w-4 h-4 flex-shrink-0" />
									{error}
								</div>
							)}

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Новый пароль
								</label>
								<div className="relative">
									<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
										placeholder="Минимум 6 символов"
										required
										minLength={6}
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Подтвердите пароль
								</label>
								<div className="relative">
									<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
									<input
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
										placeholder="Повторите пароль"
										required
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{loading ? (
									<Loader className="w-5 h-5 animate-spin" />
								) : (
									<>
										Сохранить пароль
										<ArrowRight className="w-5 h-5" />
									</>
								)}
							</button>
						</form>
					)}

					<div className="mt-6 text-center">
						<Link
							to="/login"
							className="text-slate-500 hover:text-slate-700 text-sm"
						>
							Отмена
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
