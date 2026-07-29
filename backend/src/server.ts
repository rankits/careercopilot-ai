import dotenv from "dotenv";
import app from "@/app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on Port ${PORT}`);
  console.log(`Server is running on ${BASE_URL}`);
});
