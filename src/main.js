const sellers = data.sellers;
const products = data.products;
const purchase_records = data.purchase_records;
const customers = data.customers;

/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(_product, purchase) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;
  return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { total_profit } = seller;
  if (index === 0) {
    return 0.15 * total_profit;
  } else if (index == 1 || index == 2) {
    return 0.1 * total_profit;
  } else if (index == total - 1) {
    return 0;
  } else {
    return 0.05 * total_profit;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (!data) {
    throw new Error("Некорректные входные данные");
  }

  if (
    !Array.isArray(sellers) ||
    !Array.isArray(products) ||
    !Array.isArray(purchase_records) ||
    !Array.isArray(customers)
  ) {
    throw new Error("Один из элементов не является массивом");
  }

  if (
    sellers.length === 0 ||
    products.length === 0 ||
    purchase_records.length === 0 ||
    customers.length === 0
  ) {
    throw new Error("Один из элементов пустой");
  }

  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (
    !typeof options === "object" ||
    !typeof calculateRevenue === "function" ||
    !typeof calculateBonus === "function"
  ) {
    throw new Error("Неверный аргумент options");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    total_sales: 0,
    total_profit: 0,
    revenue: 0,
    products_sold: {},
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  sellerIndex = Object.fromEntries(
    sellers.map((seller, index) => [seller.id, sellerStats[index]])
  );

  productIndex = Object.fromEntries(
    products.map((product) => [product.sku, product])
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца

  purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец

    sellerStats.forEach(
      (item) =>
        item.id === seller.id &&
        (item.total_sales++, (item.revenue += +record.total_amount))
    );

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      const cost = product.purchase_price * item.quantity; // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const revenue = calculateRevenue(product, item); // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const profit = revenue - cost; // Посчитать прибыль: выручка минус себестоимость

      // Увеличить общую накопленную прибыль (profit) у продавца
      sellerStats.map((value) => {
        if (seller.id === value.id) {
          value.total_profit += profit;
        }
      });

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }

      // По артикулу товара увеличить его проданное количество у продавца
      sellerStats.map((value) => {
        if (seller.id === value.id) {
          value.products_sold[item.sku] += item.quantity;
        }
      });
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.total_profit - a.total_profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index, Array) => {
    seller.bonus = calculateBonus(index, Array.length, seller); // Считаем бонус
    seller.products_sold = Object.entries(seller.products_sold) // seller.top_products = // Формируем топ-10 товаров
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.total_profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.total_sales, // Целое число, количество продаж продавца
    top_products: seller.products_sold, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
