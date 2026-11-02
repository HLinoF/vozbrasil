"use client";
import dynamic from "next/dynamic";
import { Loading } from "./shared";
export const BrazilMap = dynamic(() => import("./brazil-map"), {
  ssr: false,
  loading: Loading,
});
