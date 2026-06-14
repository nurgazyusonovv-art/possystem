// Маалымат катмары — Supabase конфигурацияланса аны, болбосо локалдык
// демо режимди (localStorage + BroadcastChannel) колдонот.

import { USE_SUPABASE } from "./config";
import * as supa from "./providers/supabaseApi";
import * as mock from "./providers/mockApi";
export type { CreateOrderInput } from "./providers/supabaseApi";

const impl = USE_SUPABASE ? supa : mock;

export const getCategories = impl.getCategories;
export const getProducts = impl.getProducts;
export const addCategory = impl.addCategory;
export const deleteCategory = impl.deleteCategory;
export const addProduct = impl.addProduct;
export const updateProduct = impl.updateProduct;
export const deleteProduct = impl.deleteProduct;
export const addTable = impl.addTable;
export const deleteTable = impl.deleteTable;
export const getTables = impl.getTables;
export const getTableByToken = impl.getTableByToken;
export const getStaff = impl.getStaff;
export const addStaff = impl.addStaff;
export const deleteStaff = impl.deleteStaff;
export const loginWithPin = impl.loginWithPin;
export const signOut = impl.signOut;
export const getOrders = impl.getOrders;
export const getOrder = impl.getOrder;
export const createOrder = impl.createOrder;
export const updateOrderStatus = impl.updateOrderStatus;
export const updateItemStatus = impl.updateItemStatus;
export const setOrderDiscount = impl.setOrderDiscount;
export const payOrder = impl.payOrder;
export const getPayments = impl.getPayments;
export const uploadImage = impl.uploadImage;
export const subscribeOrders = impl.subscribeOrders;

/** UI'де демо режимди көрсөтүү үчүн */
export const IS_DEMO = !USE_SUPABASE;
