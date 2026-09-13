'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // โหลดข้อมูลเมื่อ mount
  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดข้อมูลประวัติการขายไม่สำเร็จ: ' + error.message);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  }

  // คำนวณยอดขายรวมทั้งหมดจากทุกรายการ
  const totalSum = sales.reduce(
    (sum, sale) => sum + (Number(sale.total_price) || 0),
    0
  );

  // แปลงเวลาให้อ่านง่าย (วันที่ + เวลา)
  function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div className="card">
        <strong>ยอดขายรวมทั้งหมด: {totalSum.toFixed(2)} บาท</strong>
        {' '}(ทั้งหมด {sales.length} รายการ)
      </div>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan="4">ยังไม่มีประวัติการขาย</td>
              </tr>
            )}
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDateTime(sale.sold_at)}</td>
                <td>{sale.product_name}</td>
                <td>{sale.quantity}</td>
                <td>{Number(sale.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
