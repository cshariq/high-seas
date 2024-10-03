import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { deleteSession } from "../utils/auth";

export async function GET(request: NextRequest) {
  await deleteSession();
  redirect("/");
}