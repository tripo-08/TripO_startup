import React, { useEffect, useState } from "react";
import {
    Plus,
    Edit,
    Trash2,
    MapPin,
    Route,
    ToggleLeft,
    ToggleRight,
    X,
} from "lucide-react";

const RoutesManagement = () => {
    const [routes, setRoutes] = useState([]);
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);

    const [formData, setFormData] = useState({
        sourceName: "",
        destinationName: "",
        intermediateStops: [""],
        active: true,
    });

    // ✅ Correct API base (Render backend)
    const API = import.meta.env.VITE_API_URL;

    // ================= FETCH ROUTES =================
    const fetchRoutes = async () => {
        try {
            const token = localStorage.getItem("adminToken");

            const response = await fetch(`${API}/api/admin/routes`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setRoutes(data.data);
            }
        } catch (err) {
            console.error("Error fetching routes:", err);
            setError("Failed to fetch routes");
        } finally {
            setLoading(false);
        }
    };

    // ================= FETCH STOPS =================
    const fetchStops = async () => {
        try {
            const token = localStorage.getItem("adminToken");

            const response = await fetch(`${API}/api/admin/stops`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setStops(data.data || []);
            }
        } catch (err) {
            console.error("Error fetching stops:", err);
        }
    };

    useEffect(() => {
        fetchRoutes();
        fetchStops();
    }, []);

    // ================= RESET FORM =================
    const resetForm = () => {
        setFormData({
            sourceName: "",
            destinationName: "",
            intermediateStops: [""],
            active: true,
        });
        setEditingRoute(null);
        setShowForm(false);
        setError("");
        setSuccess("");
    };

    // ================= STOP MANAGEMENT =================
    const addIntermediateStop = () => {
        setFormData((prev) => ({
            ...prev,
            intermediateStops: [...prev.intermediateStops, ""],
        }));
    };

    const removeIntermediateStop = (index) => {
        if (formData.intermediateStops.length > 1) {
            setFormData((prev) => ({
                ...prev,
                intermediateStops: prev.intermediateStops.filter(
                    (_, i) => i !== index
                ),
            }));
        }
    };

    const updateIntermediateStop = (index, value) => {
        setFormData((prev) => ({
            ...prev,
            intermediateStops: prev.intermediateStops.map((stop, i) =>
                i === index ? value : stop
            ),
        }));
    };

    const moveStopUp = (index) => {
        if (index > 0) {
            setFormData((prev) => {
                const newStops = [...prev.intermediateStops];
                [newStops[index - 1], newStops[index]] = [
                    newStops[index],
                    newStops[index - 1],
                ];
                return { ...prev, intermediateStops: newStops };
            });
        }
    };

    const moveStopDown = (index) => {
        if (index < formData.intermediateStops.length - 1) {
            setFormData((prev) => {
                const newStops = [...prev.intermediateStops];
                [newStops[index], newStops[index + 1]] = [
                    newStops[index + 1],
                    newStops[index],
                ];
                return { ...prev, intermediateStops: newStops };
            });
        }
    };

    // ================= SUBMIT ROUTE =================
    const handleSubmit = async (e) => {
        e.preventDefault();

        setSubmitting(true);
        setError("");
        setSuccess("");

        const findStopByName = (name) => {
            if (!name) return null;
            return (
                stops.find(
                    (s) =>
                        s.name.toLowerCase().trim() ===
                        name.toLowerCase().trim()
                ) || null
            );
        };

        const sourceStop = findStopByName(formData.sourceName);
        const destStop = findStopByName(formData.destinationName);

        if (!sourceStop || !destStop) {
            setError("Source/Destination must exist in stops list");
            setSubmitting(false);
            return;
        }

        const intermediateStopsResolved =
            formData.intermediateStops
                .filter((s) => s.trim() !== "")
                .map(findStopByName);

        if (intermediateStopsResolved.some((s) => !s)) {
            setError("Invalid intermediate stop");
            setSubmitting(false);
            return;
        }

        try {
            const token = localStorage.getItem("adminToken");

            const url = editingRoute
                ? `${API}/api/admin/routes/${editingRoute.id}`
                : `${API}/api/admin/routes`;

            const method = editingRoute ? "PATCH" : "POST";

            const routeData = {
                source: {
                    stopId: sourceStop.id,
                    name: sourceStop.name,
                },
                destination: {
                    stopId: destStop.id,
                    name: destStop.name,
                },
                stops: intermediateStopsResolved.map((stop) => ({
                    stopId: stop.id,
                    name: stop.name,
                })),
                active: formData.active,
            };

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(routeData),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess("Route saved successfully");
                fetchRoutes();
                resetForm();
            } else {
                setError(data.error?.message || "Save failed");
            }
        } catch {
            setError("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    // ================= DELETE =================
    const handleDelete = async (id) => {
        if (!confirm("Delete this route?")) return;

        try {
            const token = localStorage.getItem("adminToken");

            await fetch(`${API}/api/admin/routes/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchRoutes();
        } catch {
            setError("Delete failed");
        }
    };

    // ================= TOGGLE =================
    const toggleRouteStatus = async (route) => {
        try {
            const token = localStorage.getItem("adminToken");

            await fetch(`${API}/api/admin/routes/${route.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    active: !route.active,
                }),
            });

            fetchRoutes();
        } catch {
            console.error("Toggle failed");
        }
    };

    if (loading)
        return (
            <div className="text-white text-center p-10">
                Loading...
            </div>
        );

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white">
            <h1 className="text-2xl font-bold mb-4">
                Route Management
            </h1>

            {/* ROUTE LIST */}
            {routes.map((route) => (
                <div key={route.id} className="bg-gray-800 p-4 mb-3 rounded">
                    <div>
                        {route.source.name} → {route.destination.name}
                    </div>

                    <button onClick={() => handleDelete(route.id)}>
                        <Trash2 />
                    </button>

                    <button onClick={() => toggleRouteStatus(route)}>
                        {route.active ? <ToggleRight /> : <ToggleLeft />}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default RoutesManagement;