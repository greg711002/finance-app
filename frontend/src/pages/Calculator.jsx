import { useState } from "react";
import {
	Calculator as CalcIcon,
	DollarSign,
	Percent,
	TrendingUp,
} from "lucide-react";

function evaluateExpression(s) {
	const expr = s.replace(/\s+/g, "");
	let i = 0;

	function parseNumber() {
		const start = i;
		while (i < expr.length && /[0-9.]/.test(expr[i])) i++;
		if (start === i) throw new Error("number expected");
		const value = parseFloat(expr.slice(start, i));
		if (Number.isNaN(value)) throw new Error("invalid number");
		return value;
	}

	function parseUnary() {
		if (expr[i] === "-") {
			i++;
			return -parseUnary();
		}
		if (expr[i] === "+") {
			i++;
			return parseUnary();
		}
		return parseValue();
	}

	function parseValue() {
		if (expr[i] === "(") {
			i++;
			const value = parseAddSub();
			if (expr[i] === ")") i++;
			return value;
		}
		return parseNumber();
	}

	function parseMulDiv() {
		let value = parseUnary();
		while (
			i < expr.length &&
			(expr[i] === "*" || expr[i] === "/" || expr[i] === "%")
		) {
			const op = expr[i];
			i++;
			const rhs = parseUnary();
			if (op === "*") value *= rhs;
			else if (op === "/") {
				if (rhs === 0) throw new Error("division by zero");
				value /= rhs;
			} else value %= rhs;
		}
		return value;
	}

	function parseAddSub() {
		let value = parseMulDiv();
		while (i < expr.length && (expr[i] === "+" || expr[i] === "-")) {
			const op = expr[i];
			i++;
			const rhs = parseMulDiv();
			value = op === "+" ? value + rhs : value - rhs;
		}
		return value;
	}

	const result = parseAddSub();
	if (i < expr.length) throw new Error("unexpected character");
	return result;
}

export default function Calculator() {
	const [calcDisplay, setCalcDisplay] = useState("0");
	const [calcHistory, setCalcHistory] = useState([]);
	const [budgetCalc, setBudgetCalc] = useState({
		income: "",
		expenses: "",
		savings: "",
	});

	const handleCalcButton = (value) => {
		if (calcDisplay === "0" && value !== ".") {
			setCalcDisplay(value);
		} else {
			setCalcDisplay(calcDisplay + value);
		}
	};

	const handleCalcOperator = (op) => {
		const lastChar = calcDisplay.slice(-1);
		if (["+", "-", "*", "/", "%"].includes(lastChar)) {
			setCalcDisplay(calcDisplay.slice(0, -1) + op);
		} else {
			setCalcDisplay(calcDisplay + op);
		}
	};

	const handleCalcEquals = () => {
		try {
			const result = evaluateExpression(calcDisplay).toString();
			setCalcHistory(
				[...calcHistory, { expression: calcDisplay, result }].slice(-10),
			);
			setCalcDisplay(result);
		} catch {
			setCalcDisplay("Ошибка");
		}
	};

	const handleCalcClear = () => {
		setCalcDisplay("0");
	};

	const handleCalcBackspace = () => {
		if (calcDisplay.length === 1) {
			setCalcDisplay("0");
		} else {
			setCalcDisplay(calcDisplay.slice(0, -1));
		}
	};

	const handleBudgetCalc = () => {
		const income = parseFloat(budgetCalc.income) || 0;
		const expenses = parseFloat(budgetCalc.expenses) || 0;
		const savings = income - expenses;
		setBudgetCalc({ ...budgetCalc, savings: savings.toFixed(2) });
	};

	const formatCurrency = (value) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			minimumFractionDigits: 0,
		}).format(value || 0);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
					<CalcIcon className="w-5 h-5 text-white" />
				</div>
				<div>
					<h1 className="text-2xl font-bold text-slate-800">Калькулятор</h1>
					<p className="text-slate-500 text-sm">
						Быстрые расчёты и планирование
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Simple Calculator */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<h2 className="text-lg font-semibold text-slate-800 mb-4">
						Простой калькулятор
					</h2>

					{/* Display */}
					<div className="bg-slate-100 rounded-xl p-4 mb-4 text-right">
						<p className="text-sm text-slate-500 h-5">
							{calcHistory.length > 0 &&
								calcHistory[calcHistory.length - 1].expression}
						</p>
						<p className="text-3xl font-bold text-slate-800 truncate">
							{calcDisplay}
						</p>
					</div>

					{/* Buttons */}
					<div className="grid grid-cols-4 gap-2">
						{["C", "⌫", "%", "/"].map((btn) => (
							<button
								key={btn}
								onClick={() =>
									btn === "C"
										? handleCalcClear()
										: btn === "⌫"
											? handleCalcBackspace()
											: handleCalcOperator(btn)
								}
								className="h-12 rounded-xl font-semibold text-lg transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
							>
								{btn}
							</button>
						))}
						{["7", "8", "9", "*"].map((btn) => (
							<button
								key={btn}
								onClick={() =>
									["+", "-", "*", "/"].includes(btn)
										? handleCalcOperator(btn)
										: handleCalcButton(btn)
								}
								className="h-12 rounded-xl font-semibold text-lg transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
							>
								{btn}
							</button>
						))}
						{["4", "5", "6", "-"].map((btn) => (
							<button
								key={btn}
								onClick={() =>
									["+", "-", "*", "/"].includes(btn)
										? handleCalcOperator(btn)
										: handleCalcButton(btn)
								}
								className="h-12 rounded-xl font-semibold text-lg transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
							>
								{btn}
							</button>
						))}
						{["1", "2", "3", "+"].map((btn) => (
							<button
								key={btn}
								onClick={() =>
									["+", "-", "*", "/"].includes(btn)
										? handleCalcOperator(btn)
										: handleCalcButton(btn)
								}
								className="h-12 rounded-xl font-semibold text-lg transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
							>
								{btn}
							</button>
						))}
						<button
							onClick={() => handleCalcButton("00")}
							className="h-12 rounded-xl font-semibold text-lg transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
						>
							00
						</button>
						{["0", "."].map((btn) => (
							<button
								key={btn}
								onClick={() => handleCalcButton(btn)}
								className="h-12 rounded-xl font-semibold text-lg transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
							>
								{btn}
							</button>
						))}
						<button
							onClick={handleCalcEquals}
							className="h-12 rounded-xl font-semibold text-lg transition-all bg-primary hover:bg-primary-dark text-white"
						>
							=
						</button>
					</div>

					{/* History */}
					{calcHistory.length > 0 && (
						<div className="mt-4 pt-4 border-t border-slate-100">
							<p className="text-sm text-slate-500 mb-2">История:</p>
							<div className="space-y-1 max-h-24 overflow-y-auto">
								{calcHistory
									.slice(-5)
									.reverse()
									.map((item, i) => (
										<div
											key={i}
											className="text-sm text-slate-600 flex justify-between"
										>
											<span>{item.expression}</span>
											<span className="font-medium">= {item.result}</span>
										</div>
									))}
							</div>
						</div>
					)}
				</div>

				{/* Budget Calculator */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<div className="flex items-center gap-2 mb-4">
						<TrendingUp className="w-5 h-5 text-primary" />
						<h2 className="text-lg font-semibold text-slate-800">
							Калькулятор бюджета
						</h2>
					</div>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-600 mb-2">
								<div className="flex items-center gap-2">
									<DollarSign className="w-4 h-4 text-green-500" />
									Доходы
								</div>
							</label>
							<input
								type="number"
								value={budgetCalc.income}
								onChange={(e) =>
									setBudgetCalc({ ...budgetCalc, income: e.target.value })
								}
								placeholder="0"
								className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-600 mb-2">
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 text-red-500 rounded-full bg-red-100 flex items-center justify-center text-xs">
										−
									</div>
									Расходы
								</div>
							</label>
							<input
								type="number"
								value={budgetCalc.expenses}
								onChange={(e) =>
									setBudgetCalc({ ...budgetCalc, expenses: e.target.value })
								}
								placeholder="0"
								className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
						</div>

						<button
							onClick={handleBudgetCalc}
							className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all"
						>
							Рассчитать
						</button>

						{budgetCalc.savings !== "" && (
							<div
								className={`p-4 rounded-xl ${parseFloat(budgetCalc.savings) >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
							>
								<p className="text-sm text-slate-600 mb-1">
									Остаток / Дефицит:
								</p>
								<p
									className={`text-2xl font-bold ${parseFloat(budgetCalc.savings) >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									{formatCurrency(parseFloat(budgetCalc.savings))}
								</p>
								{parseFloat(budgetCalc.savings) >= 0 &&
									budgetCalc.income > 0 && (
										<div className="mt-2 flex items-center gap-2">
											<div className="flex-1 bg-green-200 rounded-full h-2">
												<div
													className="bg-green-500 h-2 rounded-full"
													style={{
														width: `${Math.min(100, (parseFloat(budgetCalc.savings) / parseFloat(budgetCalc.income)) * 100)}%`,
													}}
												/>
											</div>
											<span className="text-sm text-green-600 font-medium">
												{(
													(parseFloat(budgetCalc.savings) /
														parseFloat(budgetCalc.income)) *
													100
												).toFixed(1)}
												%
											</span>
										</div>
									)}
							</div>
						)}
					</div>
				</div>

				{/* Percentage Calculator */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
					<div className="flex items-center gap-2 mb-4">
						<Percent className="w-5 h-5 text-primary" />
						<h2 className="text-lg font-semibold text-slate-800">
							Процент от суммы
						</h2>
					</div>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-600 mb-2">
								Сумма
							</label>
							<input
								type="number"
								id="percent-sum"
								placeholder="10000"
								className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-600 mb-2">
								Процент
							</label>
							<input
								type="number"
								id="percent-rate"
								placeholder="15"
								className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
						</div>

						<div
							id="percent-result"
							className="p-4 bg-slate-50 rounded-xl text-center"
						>
							<p className="text-sm text-slate-500 mb-1">Результат:</p>
							<p className="text-2xl font-bold text-primary">—</p>
						</div>

						<button
							onClick={() => {
								const sum =
									parseFloat(document.getElementById("percent-sum").value) || 0;
								const rate =
									parseFloat(document.getElementById("percent-rate").value) ||
									0;
								const result = (sum * rate) / 100;
								document.getElementById("percent-result").innerHTML = `
									<p class="text-sm text-slate-500 mb-1">Результат (${rate}% от ${formatCurrency(sum)}):</p>
									<p class="text-2xl font-bold text-primary">${formatCurrency(result)}</p>
								`;
							}}
							className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all"
						>
							Рассчитать
						</button>
					</div>
				</div>

				{/* Quick Tips */}
				<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
					<h2 className="text-lg font-semibold text-slate-800 mb-4">
						💡 Полезные советы
					</h2>
					<ul className="space-y-3 text-sm text-slate-600">
						<li className="flex items-start gap-2">
							<span className="text-primary mt-0.5">•</span>
							<span>Откладывайте минимум 20% дохода на сбережения</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary mt-0.5">•</span>
							<span>
								Правило 50/30/20: 50% на нужды, 30% на желания, 20% на
								сбережения
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary mt-0.5">•</span>
							<span>Отслеживайте мелкие расходы — они накапливаются</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary mt-0.5">•</span>
							<span>Планируйте крупные покупки заранее</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
