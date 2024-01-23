import dayjs from 'dayjs';

interface Installment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

export default function createPaymentPlan(startDate: string, endDate: string, totalAmount: number, numInstallments: number): Installment[] {
  // Validate the inputs

  if (numInstallments <= 0 || totalAmount == 0) {
    throw new Error("Number of installments and total amount should be greater than 0.");
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
    throw new Error("Invalid start or end date.");
  }

  // Calculate the installment amount
  const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;

  // Generate the payment plan
  const plan: Installment[] = [];
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = start.add(i * (end.diff(start, 'day') / (numInstallments - 1)), 'day').format();
    plan.push({
      installmentNumber: i + 1,
      dueDate,
      amount: (i === numInstallments - 1 ? (totalAmount - installmentAmount * (numInstallments - 1)) - 100: installmentAmount - 100),
    });
  }

  return plan;
}

// // Usage example
// try {
//   const paymentPlan = createPaymentPlan('2024-01-06', '2024-06-06', 100, 5);
//   console.log(paymentPlan);
// } catch (error) {
//   console.error(error);
// }