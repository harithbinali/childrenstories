import { Andika, Baloo_Bhaijaan_2, Fredoka, Nunito, Tajawal } from "next/font/google";

// Storyling type families (design/storyling/tokens/typography.css), self-hosted.
export const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--ff-fredoka", display: "swap" });
export const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], style: ["normal", "italic"], variable: "--ff-nunito", display: "swap" });
export const andika = Andika({ subsets: ["latin"], weight: ["400", "700"], variable: "--ff-andika", display: "swap" });
export const baloo = Baloo_Bhaijaan_2({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--ff-baloo", display: "swap" });
export const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], variable: "--ff-tajawal", display: "swap" });

export const fontVariables = [fredoka, nunito, andika, baloo, tajawal].map((f) => f.variable).join(" ");
