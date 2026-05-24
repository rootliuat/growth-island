export interface MathProblem {
  left: number;
  right: number;
  operator: "+" | "-";
  answer: number;
  text: string;
}

export function generateProblem(): MathProblem {
  const operator = Math.random() > 0.42 ? "+" : "-";
  if (operator === "+") {
    const left = Math.floor(Math.random() * 11) + 1;
    const right = Math.floor(Math.random() * (20 - left)) + 1;
    return { left, right, operator, answer: left + right, text: `${left} + ${right} = ?` };
  }
  const left = Math.floor(Math.random() * 20) + 1;
  const right = Math.floor(Math.random() * left);
  return { left, right, operator, answer: left - right, text: `${left} - ${right} = ?` };
}

