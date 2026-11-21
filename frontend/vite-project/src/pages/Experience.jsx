// import { useEffect, useState } from "react";
// import api from "../api";            // the shared API helper — check the file name in frontend/src

// const emptyForm = {
//   experience_type: "military",
//   title: "",
//   start_date: "",
//   end_date: null,
//   duties: "",
//   achievements: "",
//   branch: "",
//   rank: "",
//   mos_code: "",
//   unit: "",
//   employer: "",
//   location: "",
// };

// export default function Experience() {
//   const [positions, setPositions] = useState([]);

//   // Draft: restore half-typed form, and save it as they type
//   const [form, setForm] = useState(
//     () => JSON.parse(localStorage.getItem("positionDraft") || "null") ?? emptyForm
//   );
//   useEffect(() => {
//     localStorage.setItem("positionDraft", JSON.stringify(form));
//   }, [form]);

//   // On page load: get saved positions from the database
//   useEffect(() => {
//     api.get("/api/history/positions/").then((res) => setPositions(res.data));
//   }, []);

//   // On save: send to the API, add to the list, clear the draft
//   async function handleSave() {
//     const res = await api.post("/api/history/positions/", form);
//     setPositions([res.data, ...positions]);
//     setForm(emptyForm);
//     localStorage.removeItem("positionDraft");
//   }

//   return (
//     <div>
//       {/* form + positions list go here (from the wireframe) */}
//     </div>
//   );
// }