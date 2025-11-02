const API_URL = "http://localhost:8080/api";

export async function admitPatient(hospitalId, admissionId, type = "WARD") {
  const res = await fetch(`${API_URL}/admitPatient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hospitalId, admissionId, type })
  });
  return res.json();
}

export async function dischargePatient(hospitalId, admissionId, type = "WARD") {
  const res = await fetch(`${API_URL}/dischargePatient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hospitalId, admissionId, type })
  });
  return res.json();
}

export async function updatePrealertStatus(hospitalId, alertId, status) {
  const res = await fetch(`${API_URL}/updatePrealertStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hospitalId, alertId, status })
  });
  return res.json();
}

export async function notifyHospital(hospitalId, title, body, data) {
  const res = await fetch(`${API_URL}/notifyHospital`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hospitalId, title, body, data })
  });
  return res.json();
}
