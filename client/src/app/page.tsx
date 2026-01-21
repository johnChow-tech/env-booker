'use client';

import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Layout, Typography, Space, App,
  Card, Modal, Form, Input, InputNumber, Popconfirm
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Environment } from '@/types';
import {
  ReloadOutlined, ThunderboltFilled, RestOutlined,
  DesktopOutlined, UserOutlined, ClockCircleOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// 定义预定表单的数据结构
interface BookingFormValues {
  user: string;
  duration_minutes: number;
}

export default function Home() {
  // === 状态管理 ===
  const { message, modal } = App.useApp();
  const [data, setData] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗相关状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Antd 表单实例
  const [form] = Form.useForm();

  // === 1. 获取环境列表 (Read) ===
  const fetchEnvs = async () => {
    setLoading(true);
    try {
      // 这里的 /api 会被 Next.js 代理转发到 Go 后端
      const res = await fetch('/api/envs');
      if (!res.ok) throw new Error('Failed to fetch');
      const jsonData = await res.json();
      setData(jsonData);
    } catch (error) {
      console.error(error);
      message.error('Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvs();
  }, []);

  // === 2. 打开预定弹窗 ===
  const openBookModal = (record: Environment) => {
    setCurrentEnv(record);
    setIsModalOpen(true);
    // 重置表单，设置默认时长为 60 分钟
    form.resetFields();
    form.setFieldsValue({ duration_minutes: 60 });
  };

  // === 3. 提交预定 (Book Action) ===
  const handleBookSubmit = async (values: BookingFormValues) => {
    if (!currentEnv) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/envs/${currentEnv.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values), // { user: "tom", duration_minutes: 60 }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Booking failed');
      }

      message.success(`Successfully booked: ${currentEnv.name}`);
      setIsModalOpen(false); // 关闭弹窗
      fetchEnvs(); // 刷新列表
    } catch (error) {
      // 如果 error 是 Error 实例，取 message；否则转为字符串
      const msg = error instanceof Error ? error.message : String(error);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // === 4. 释放环境 (Release Action) ===
  const handleRelease = async (id: number) => {
    try {
      const res = await fetch(`/api/envs/${id}/release`, {
        method: 'POST', // 后端定义的 Release 是 POST 方法
      });

      if (!res.ok) throw new Error('Release failed');

      message.success('Environment released');
      fetchEnvs(); // 刷新列表
    } catch (error) {
      message.error('Failed to release environment');
    }
  };

  // === 表格列定义 ===
  const columns: ColumnsType<Environment> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text) => (
        <Space>
          <DesktopOutlined className="text-gray-400" />
          <span className="font-semibold text-gray-700">{text}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      render: (status) => {
        const isAvail = status === 'available';
        return (
          <Tag color={isAvail ? 'success' : 'error'} className="min-w-[80px] text-center">
            {isAvail ? 'AVAILABLE' : 'OCCUPIED'}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltFilled />}
            disabled={record.status === 'occupied'}
            onClick={() => openBookModal(record)}
          >
            Book
          </Button>

          {/* 气泡确认框，防止误点 */}
          <Popconfirm
            title="Release Environment"
            description="Are you sure you want to release this environment?"
            onConfirm={() => handleRelease(record.id)}
            disabled={record.status === 'available'}
            okText="Yes"
            cancelText="No"
          >
            <Button
              danger
              size="small"
              icon={<RestOutlined />}
              disabled={record.status === 'available'}
            >
              Release
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-white border-b border-gray-200 px-8 flex items-center shadow-sm h-16 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">
            Env<span className="text-blue-600">Booker</span>
          </span>
        </div>
      </Header>

      <Content className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
              <Text type="secondary">Manage your development resources</Text>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchEnvs}
              loading={loading}
              size="large"
            >
              Refresh
            </Button>
          </div>

          <Card variant="borderless" className="shadow-sm rounded-xl">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              pagination={false}
              rowClassName="hover:bg-gray-50 transition-colors"
            />
          </Card>
        </div>
      </Content>

      {/* 预定弹窗 Modal */}
      <Modal
        title={`Book Environment: ${currentEnv?.name}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null} // 我们自定义表单提交按钮，不使用默认 Footer
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleBookSubmit}
          className="mt-4"
        >
          <Form.Item
            name="user"
            label="User Name"
            rules={[{ required: true, message: 'Please input user name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="e.g., Tom" />
          </Form.Item>

          <Form.Item
            name="duration_minutes"
            label="Duration (Minutes)"
            rules={[{ required: true, message: 'Please input duration' }]}
          >
            <InputNumber
              min={1}
              max={480}
              className="w-full"
              prefix={<ClockCircleOutlined />}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Confirm Booking
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}