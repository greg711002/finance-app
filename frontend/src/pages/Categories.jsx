import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	PlusCircle,
	Trash2,
	Edit2,
	Check,
	X,
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
} from "lucide-react";
import api from "../api";

const CATEGORY_TYPES = [
	{ value: "expense", label: "Расход" },
	{ value: "income", label: "Доход" },
];

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

const ICON_KEYS = Object.keys(ICONS);

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

const schema = z.object({
	name: z.string().trim().min(1, "Введите название категории"),
	type: z.enum(["expense", "income"]),
	icon: z.string().min(1, "Выберите иконку"),
	color: z.string().min(1, "Выберите цвет"),
});

function CategoryIcon({ name, className }) {
	const Icon = ICONS[name];
	if (!Icon) return <Wallet className={className} />;
	return <Icon className={className} />;
}

export default function Categories() {
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [serverError, setServerError] = useState("");
	const modalRef = useRef(null);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			type: "expense",
			icon: "wallet",
			color: "#2563eb",
		},
		mode: "onChange",
	});

	const selectedIcon = watch("icon");
	const selectedColor = watch("color");
	const selectedType = watch("type");

	useEffect(() => {
		loadCategories();
	}, []);

	// Escape to close modal
	useEffect(() => {
		if (!showModal) return;
		const onKey = (e) => {
			if (e.key === "Escape") closeModal();
		};
		document.addEventListener("keydown", onKey);
		modalRef.current?.focus();
		return () => document.removeEventListener("keydown", onKey);
	}, [showModal]);

	const loadCategories = async () => {
		try {
			const res = await api.get("/categories");
			setCategories(res.data);
		} catch (err) {
			console.error("Failed to load categories", err);
		} finally {
			setLoading(false);
		}
	};

	const openCreate = () => {
		setEditingId(null);
		setServerError("");
		reset({ name: "", type: "expense", icon: "wallet", color: "#2563eb" });
		setShowModal(true);
	};

	const openEdit = (cat) => {
		setEditingId(cat.id);
		setServerError("");
		reset({
			name: cat.name,
			type: cat.type || "expense",
			icon: cat.icon || "wallet",
			color: cat.color || "#2563eb",
		});
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
		setEditingId(null);
		setServerError("");
	};

	const onSubmit = async (values) => {
		setServerError("");
		try {
			if (editingId) {
				await api.put(`/categories/${editingId}`, values);
			} else {
				await api.post("/categories", values);
			}
			await loadCategories();
			closeModal();
		} catch (err) {
			const detail = err.response?.data?.detail;
			setServerError(
				typeof detail === "string" ? detail : "Ошибка при сохранении категории",
			);
		}
	};

	const handleDelete = async (cat) => {
		if (!window.confirm(`Удалить категорию «${cat.name}»?`)) return;
		try {
			await api.delete(`/categories/${cat.id}`);
			await loadCategories();
		} catch (err) {
			const detail = err.response?.data?.detail;
			alert(typeof detail === "string" ? detail : "Ошибка при удалении категории");
		}
	};

	const userCategories = categories.filter((c) => c.is_system === 0);
	const systemCategories = categories.filter((c) => c.is_system === 1);

	const renderList = (list, label, emptyText) => (
		<section className="space-y-4">
			<h2 className="text-lg font-semibold text-secondary">{label}</h2>
			{list.length === 0 ? (
				<p className="text-slate-500 text-sm">{emptyText}</p>
			) : (
				<ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{list.map((cat) => (
						<li
							key={cat.id}
							className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm"
						>
							<span
								className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
								style={{ backgroundColor: cat.color || "#2563eb" }}
								aria-hidden="true"
							>
								<CategoryIcon
									name={cat.icon}
									className="w-5 h-5 text-white"
								/>
							</span>
							<span className="flex-1 min-w-0">
								<span className="block font-medium text-secondary truncate">
									{cat.name}
								</span>
								<span className="block text-xs text-slate-500">
									{cat.type === "income" ? "Доход" : "Расход"}
								</span>
							</span>
							{cat.is_system === 0 && (
								<span className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => openEdit(cat)}
										className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary transition-all"
										aria-label={`Редактировать «${cat.name}»`}
									>
										<Edit2 className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDelete(cat)}
										className="p-2 rounded-lg text-slate-500 hover:bg-danger/10 hover:text-danger transition-all"
										aria-label={`Удалить «${cat.name}»`}
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</span>
							)}
						</li>
					))}
				</ul>
			)}
		</section>
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-secondary">Категории</h1>
					<p className="text-slate-500 mt-1">
						Управляйте категориями доходов и расходов
					</p>
				</div>
				<button
					type="button"
					onClick={openCreate}
					className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all flex items-center gap-2"
				>
					<PlusCircle className="w-5 h-5" />
					Добавить
				</button>
			</div>

			{loading ? (
				<div className="space-y-4">
					<div className="animate-pulse h-8 w-32 bg-slate-100 rounded-lg" />
					<div className="animate-pulse h-20 bg-slate-100 rounded-xl" />
				</div>
			) : (
				<>
					{renderList(
						systemCategories,
						"Системные категории",
						"Системные категории отсутствуют",
					)}
					{renderList(
						userCategories,
						"Мои категории",
						"Своих категорий пока нет — добавьте первую",
					)}
				</>
			)}

			{/* Modal */}
			{showModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/50 backdrop-blur-sm"
					role="dialog"
					aria-modal="true"
					aria-labelledby="category-modal-title"
				>
					<div
						ref={modalRef}
						tabIndex={-1}
						className="w-full max-w-md bg-white rounded-2xl shadow-2xl outline-none"
					>
						<div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
							<h2
								id="category-modal-title"
								className="text-xl font-bold text-secondary"
							>
								{editingId ? "Редактировать категорию" : "Новая категория"}
							</h2>
							<button
								type="button"
								onClick={closeModal}
								className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
								aria-label="Закрыть"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<form
							onSubmit={handleSubmit(onSubmit)}
							className="p-6 space-y-5"
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

							<div>
								<label
									htmlFor="cat-name"
									className="block text-sm font-medium text-slate-700 mb-2"
								>
									Название
								</label>
								<input
									id="cat-name"
									type="text"
									{...register("name")}
									className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
									placeholder="Например: Транспорт"
									aria-invalid={!!errors.name}
								/>
								{errors.name && (
									<p className="mt-1 text-sm text-danger">{errors.name.message}</p>
								)}
							</div>

							<div>
								<span className="block text-sm font-medium text-slate-700 mb-2">
									Тип
								</span>
								<div className="flex gap-2" role="radiogroup" aria-label="Тип категории">
									{CATEGORY_TYPES.map((t) => (
										<button
											key={t.value}
											type="button"
											onClick={() => setValue("type", t.value)}
											aria-pressed={selectedType === t.value}
											className={`flex-1 py-2.5 px-3 rounded-xl font-medium border transition-all ${
												selectedType === t.value
													? t.value === "expense"
														? "bg-danger text-white border-danger shadow-lg shadow-danger/25"
														: "bg-success text-white border-success shadow-lg shadow-success/25"
													: "border-slate-200 text-slate-500 hover:bg-slate-50"
											}`}
										>
											{t.label}
										</button>
									))}
								</div>
							</div>

							<div>
								<span className="block text-sm font-medium text-slate-700 mb-2">
									Иконка
								</span>
								<div className="grid grid-cols-6 gap-2">
									{ICON_KEYS.map((key) => {
										const Icon = ICONS[key];
										return (
											<button
												key={key}
												type="button"
												onClick={() => setValue("icon", key)}
												aria-label={`Иконка ${key}`}
												aria-pressed={selectedIcon === key}
												className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
													selectedIcon === key
														? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
														: "border-slate-200 text-slate-400 hover:border-slate-300"
												}`}
											>
												<Icon className="w-5 h-5" />
											</button>
										);
									})}
								</div>
							</div>

							<div>
								<span className="block text-sm font-medium text-slate-700 mb-2">
									Цвет
								</span>
								<div className="flex flex-wrap gap-2">
									{COLORS.map((c) => (
										<button
											key={c}
											type="button"
											onClick={() => setValue("color", c)}
											aria-label={`Цвет ${c}`}
											aria-pressed={selectedColor === c}
											className={`w-8 h-8 rounded-full transition-all ${
												selectedColor === c
													? "ring-2 ring-offset-2 ring-secondary scale-110"
													: "hover:scale-110"
											}`}
											style={{ backgroundColor: c }}
										/>
									))}
								</div>
							</div>

							<div className="flex items-center gap-4 pt-2">
								<span
									className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
									style={{ backgroundColor: selectedColor }}
									aria-hidden="true"
								>
									<CategoryIcon
										name={selectedIcon}
										className="w-5 h-5 text-white"
									/>
								</span>
								<span className="text-sm text-slate-500">
									Предпросмотр категории
								</span>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={closeModal}
									className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all"
								>
									Отмена
								</button>
								<button
									type="submit"
									className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
								>
									<Check className="w-5 h-5" />
									{editingId ? "Сохранить" : "Создать"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
