import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import api from "../api";
import {
	ArrowLeft,
	TrendingUp,
	TrendingDown,
	Calendar,
	Tag,
	FileText,
	Check,
} from "lucide-react";

const schema = z
	.object({
		amount: z
			.string()
			.min(1, "Введите сумму")
			.refine((v) => {
				const n = parseFloat(v);
				return !isNaN(n) && n > 0;
			}, "Сумма должна быть больше нуля"),
		description: z.string().optional(),
		date: z.string().min(1, "Выберите дату"),
		category_id: z.string().optional(),
	})
	.refine(
		(data) => data.category_id !== "" || data.category_id === undefined,
		{ message: "Выберите категорию", path: ["category_id"] },
	);

export default function AddTransaction() {
	const { type: urlType } = useParams();
	const navigate = useNavigate();
	const [type, setType] = useState(urlType || "expense");
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(false);
	const [serverError, setServerError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			amount: "",
			description: "",
			date: format(new Date(), "yyyy-MM-dd"),
			category_id: "",
		},
		mode: "onChange",
	});

	const amount = watch("amount");

	useEffect(() => {
		if (urlType && ["income", "expense"].includes(urlType)) {
			setType(urlType);
		}
	}, [urlType]);

	useEffect(() => {
		let active = true;
		const load = async () => {
			setLoading(true);
			try {
				const res = await api.get("/categories");
				const filtered = res.data.filter((c) => c.type === type);
				if (!active) return;
				setCategories(filtered);
				setValue("category_id", filtered.length > 0 ? String(filtered[0].id) : "");
			} catch (err) {
				console.error("Failed to load categories", err);
			} finally {
				if (active) setLoading(false);
			}
		};
		load();
		return () => {
			active = false;
		};
	}, [type, setValue]);

	const handleTypeChange = (newType) => {
		setType(newType);
		setValue("category_id", "");
	};

	const onSubmit = async (values) => {
		setServerError("");
		try {
			const amount = parseFloat(values.amount);
			if (isNaN(amount) || amount <= 0) return;
			await api.post("/transactions", {
				amount,
				description: values.description?.trim() || null,
				date: values.date,
				category_id: values.category_id ? parseInt(values.category_id, 10) : null,
			});
			navigate("/");
		} catch (err) {
			const detail = err.response?.data?.detail;
			const msg =
				typeof detail === "string" ? detail : "Ошибка при создании транзакции";
			setServerError(msg);
		}
	};

	const formatCurrency = (value) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			minimumFractionDigits: 0,
		}).format(value || 0);
	};

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<button
					onClick={() => navigate(-1)}
					className="p-2 rounded-xl hover:bg-slate-100 transition-all"
					aria-label="Назад"
				>
					<ArrowLeft className="w-6 h-6 text-slate-600" />
				</button>
				<div>
					<h1 className="text-2xl font-bold text-secondary">Новая операция</h1>
					<p className="text-slate-500 mt-1">Добавьте доход или расход</p>
				</div>
			</div>

			{/* Type selector */}
			<div
				className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex"
				role="radiogroup"
				aria-label="Тип операции"
			>
				<button
					type="button"
					onClick={() => handleTypeChange("income")}
					aria-pressed={type === "income"}
					className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
						type === "income"
							? "bg-success text-white shadow-lg shadow-success/25"
							: "text-slate-500 hover:bg-slate-50"
					}`}
				>
					<TrendingUp className="w-5 h-5" />
					Доход
				</button>
				<button
					type="button"
					onClick={() => handleTypeChange("expense")}
					aria-pressed={type === "expense"}
					className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
						type === "expense"
							? "bg-danger text-white shadow-lg shadow-danger/25"
							: "text-slate-500 hover:bg-slate-50"
					}`}
				>
					<TrendingDown className="w-5 h-5" />
					Расход
				</button>
			</div>

			{/* Form */}
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6"
				noValidate
			>
				{serverError && (
					<div
						className="p-3 rounded-xl bg-danger/10 text-danger text-sm"
						role="alert"
					>
						{serverError}
					</div>
				)}

				{/* Amount */}
				<div>
					<label
						htmlFor="tx-amount"
						className="block text-sm font-medium text-slate-700 mb-2"
					>
						Сумма
					</label>
					<div className="relative">
						<input
							id="tx-amount"
							type="number"
							inputMode="decimal"
							step="0.01"
							min="0"
							placeholder="0"
							{...register("amount")}
							className="w-full px-4 py-4 text-3xl font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12"
							aria-invalid={!!errors.amount}
						/>
						<span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
							₽
						</span>
					</div>
					{errors.amount && (
						<p className="mt-1 text-sm text-danger">{errors.amount.message}</p>
					)}
					{amount && !errors.amount && !isNaN(parseFloat(amount)) && (
						<p
							className={`mt-2 text-sm ${
								type === "income" ? "text-success" : "text-danger"
							}`}
						>
							{type === "income" ? "Вы получите" : "Вы потратите"}:{" "}
							{formatCurrency(parseFloat(amount))}
						</p>
					)}
				</div>

				{/* Category */}
				<div>
					<label
						htmlFor="tx-category"
						className="block text-sm font-medium text-slate-700 mb-2"
					>
						<Tag className="w-4 h-4 inline mr-1" />
						Категория
					</label>
					{loading ? (
						<div className="animate-pulse h-12 bg-slate-100 rounded-xl" />
					) : categories.length === 0 ? (
						<div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-sm">
							Нет категорий типа «{type === "income" ? "доход" : "расход"}».
							Сначала создайте категорию в разделе «Категории».
						</div>
					) : (
						<select
							id="tx-category"
							{...register("category_id")}
							className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							aria-invalid={!!errors.category_id}
						>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					)}
					{errors.category_id && (
						<p className="mt-1 text-sm text-danger">
							{errors.category_id.message}
						</p>
					)}
				</div>

				{/* Description */}
				<div>
					<label
						htmlFor="tx-description"
						className="block text-sm font-medium text-slate-700 mb-2"
					>
						<FileText className="w-4 h-4 inline mr-1" />
						Описание (необязательно)
					</label>
					<input
						id="tx-description"
						type="text"
						{...register("description")}
						placeholder="Например: Продукты в Пятёрочке"
						className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
					/>
				</div>

				{/* Date */}
				<div>
					<label
						htmlFor="tx-date"
						className="block text-sm font-medium text-slate-700 mb-2"
					>
						<Calendar className="w-4 h-4 inline mr-1" />
						Дата
					</label>
					<input
						id="tx-date"
						type="date"
						{...register("date")}
						className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						aria-invalid={!!errors.date}
					/>
					{errors.date && (
						<p className="mt-1 text-sm text-danger">{errors.date.message}</p>
					)}
				</div>

				{/* Submit */}
				<button
					type="submit"
					disabled={isSubmitting}
					className={`w-full py-4 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
						type === "income"
							? "bg-success hover:bg-emerald-600 text-white shadow-lg shadow-success/25"
							: "bg-danger hover:bg-red-600 text-white shadow-lg shadow-danger/25"
					}`}
				>
					{isSubmitting ? (
						<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					) : (
						<>
							<Check className="w-5 h-5" />
							Добавить {type === "income" ? "доход" : "расход"}
						</>
					)}
				</button>
			</form>
		</div>
	);
}
