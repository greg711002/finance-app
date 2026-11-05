import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { Wallet, Mail, Lock, User, ArrowRight } from "lucide-react";

const schema = z.object({
	name: z.string().trim().min(1, "Введите имя"),
	email: z.string().min(1, "Введите email").email("Некорректный email"),
	password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
});

export default function Register() {
	const [serverError, setServerError] = useState("");
	const { register: authRegister } = useAuth();
	const navigate = useNavigate();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm({ resolver: zodResolver(schema), mode: "onChange" });

	const onSubmit = async (values) => {
		setServerError("");
		try {
			await authRegister(values.email, values.password, values.name);
			navigate("/");
		} catch (err) {
			setServerError(err.response?.data?.detail || "Ошибка регистрации");
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-4 shadow-lg shadow-primary/25">
						<Wallet className="w-8 h-8 text-white" />
					</div>
					<h1 className="text-2xl font-bold text-secondary">
						Создайте аккаунт
					</h1>
					<p className="text-slate-500 mt-2">Начните управлять финансами</p>
				</div>

				<div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
						{serverError && (
							<div
								className="p-3 rounded-xl bg-danger/10 text-danger text-sm"
								role="alert"
							>
								{serverError}
							</div>
						)}

						<div>
							<label
								htmlFor="reg-name"
								className="block text-sm font-medium text-slate-700 mb-2"
							>
								Имя
							</label>
							<div className="relative">
								<User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
								<input
									id="reg-name"
									type="text"
									autoComplete="name"
									{...register("name")}
									className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
									placeholder="Александр"
									aria-invalid={!!errors.name}
								/>
							</div>
							{errors.name && (
								<p className="mt-1 text-sm text-danger">{errors.name.message}</p>
							)}
						</div>

						<div>
							<label
								htmlFor="reg-email"
								className="block text-sm font-medium text-slate-700 mb-2"
							>
								Email
							</label>
							<div className="relative">
								<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
								<input
									id="reg-email"
									type="email"
									autoComplete="email"
									{...register("email")}
									className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
									placeholder="your@email.com"
									aria-invalid={!!errors.email}
								/>
							</div>
							{errors.email && (
								<p className="mt-1 text-sm text-danger">{errors.email.message}</p>
							)}
						</div>

						<div>
							<label
								htmlFor="reg-password"
								className="block text-sm font-medium text-slate-700 mb-2"
							>
								Пароль
							</label>
							<div className="relative">
								<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
								<input
									id="reg-password"
									type="password"
									autoComplete="new-password"
									{...register("password")}
									className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
									placeholder="Минимум 6 символов"
									aria-invalid={!!errors.password}
								/>
							</div>
							{errors.password && (
								<p className="mt-1 text-sm text-danger">
									{errors.password.message}
								</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{isSubmitting ? (
								<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							) : (
								<>
									Зарегистрироваться
									<ArrowRight className="w-5 h-5" />
								</>
							)}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-slate-500">
							Уже есть аккаунт?{" "}
							<Link
								to="/login"
								className="text-primary font-medium hover:underline"
							>
								Войти
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
