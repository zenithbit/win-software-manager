import type { Metadata } from "next";
import AdminDashboard from "./components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin — Win Software Manager",
  description: "Quản lý danh sách phần mềm",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
