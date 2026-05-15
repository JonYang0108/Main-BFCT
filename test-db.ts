import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
);

async function checkDB() {
  // Check vendor_request approve
  const { error: vrErr, data } = await supabase.rpc("approve_vendor_request", {
    _request_id: "00000000-0000-0000-0000-000000000000",
  });
  console.log(
    "RPC approve_vendor_request:",
    vrErr ? vrErr.message : "OK",
    data,
  );

  // Check announcements status constraints
  const { error: a1Err } = await supabase
    .from("announcements")
    .insert({
      title: "test1",
      content: "test",
      status: "urgent",
      type: "info",
    });
  console.log("Insert urgent lowercase:", a1Err ? a1Err.message : "OK");

  const { error: a2Err } = await supabase
    .from("announcements")
    .insert({
      title: "test2",
      content: "test",
      status: "Urgent",
      type: "info",
    });
  console.log("Insert Urgent capitalized:", a2Err ? a2Err.message : "OK");

  const { error: a3Err } = await supabase
    .from("announcements")
    .insert({
      title: "test3",
      content: "test",
      status: "Normal",
      type: "urgent",
    });
  console.log("Insert type urgent:", a3Err ? a3Err.message : "OK");
}

checkDB();
