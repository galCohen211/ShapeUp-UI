import React, { useEffect, useState } from "react";
import { Card, Row, Col, Button, Modal } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import StatisticsCard from "../../../components/AdminModalContents/StatisticsCard/StatisticsCard";
import { fetchDashboardCounts, getRevenueByCity, getRevenueByDate } from "../../../api/admin";
import { useNavigate } from "react-router-dom";

interface DailyRevenue {
  day: string;
  revenue: number;
}

interface CityRevenue {
  city: string;
  revenue: number;
}

interface AdminStats {
  userCount: number;
  gymOwnerCount: number;
  adminCount: number;
  gymCount: number;
}

const DashboardAdmin: React.FC = () => {
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [cityRevenue, setCityRevenue] = useState<CityRevenue[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRevenues = async () => {
      try {
        const [cityData, dailyData] = await Promise.all([
          getRevenueByCity(),
          getRevenueByDate()
        ]);
        setCityRevenue(cityData);
        setDailyRevenue(dailyData);
      } catch (err) {
        console.error("Failed to load revenues", err);
      }
    };
  
    fetchRevenues();
  }, []);
  

  const [counts, setCounts] = useState<AdminStats>({
    userCount: 0,
    gymOwnerCount: 0,
    adminCount: 0,
    gymCount: 0,
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const data: AdminStats = await fetchDashboardCounts(true);
        setCounts(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadCounts();
  }, []);

  const totalAccounts = counts
    ? counts.userCount + counts.gymOwnerCount + counts.adminCount
    : 0;

  const COLORS = {
    users: "#A2E1C8",
    gymOwners: "#E25B4B",
    gyms: "#4B9BD7",
  };

  const labels = ["Total Users", "Total Gym Owners", "Total Gyms"];

  const dataSets = [
    [
      { name: "Users", value: counts?.userCount },
      { name: "Remaining", value: totalAccounts - counts?.userCount },
    ],
    [
      { name: "Gym Owners", value: counts?.gymOwnerCount },
      { name: "Remaining", value: totalAccounts - counts?.gymOwnerCount },
    ],
    [
      { name: "Gyms", value: counts?.gymCount },
      { name: "Remaining", value: 0 },
    ],
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
        Admin Dashboard
      </h1>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <StatisticsCard
            dataSets={dataSets}
            colors={[COLORS.gymOwners, COLORS.users, COLORS.gyms]}
            labels={labels}
          />
        </Col>

        <Col span={12}>
          <Card title="Quick Actions" style={{ height: "100%" }}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  onClick={() => navigate("/admin/users")}
                >
                  Manage Users
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  onClick={() => navigate("/admin/gyms")}
                >
                  Manage Gyms
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  onClick={() => navigate("/admin/pending")}
                >
                  Manage Gym Owners Status
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Revenues" style={{ height: "100%" }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4B9BD7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Revenue by City" style={{ height: "100%" }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cityRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="city" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="revenue" fill="#F0AD4E" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardAdmin;
