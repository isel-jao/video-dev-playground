import { BrowserRouter, Route, Routes } from "react-router";
import PrivateLayout from "../private/layout";
import HomePage from "../private/home";
import AboutPage from "../private/about";
import LoginPage from "../public/login";
import DevPage from "../public/dev";
import NotfoundPage from "../public/notfound";
import ContactPage from "../private/contact";
import GlobalLayout from "../layout";
import { env } from "@/lib/env";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GlobalLayout />}>
          <Route element={<PrivateLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotfoundPage />} />
          {env.VITE_NODE_ENV === "development" && (
            <Route path="/dev" element={<DevPage />} />
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
