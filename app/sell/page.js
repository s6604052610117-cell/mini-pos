'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  // รายการสินค้าทั้งหมด (สำหรับ dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ค่าที่ผู้ใช้เลือก/กรอก
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  // สถานะการทำงาน
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // โหลดรายการสินค้าเมื่อ mount
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setErrorMsg('โหลดข้อมูลสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  // สินค้าที่ถูกเลือกอยู่ตอนนี้ (ใช้คำนวณยอดรวม/ตรวจสต็อก)
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณยอดรวม = ราคา x จำนวน
  const qtyNumber = parseInt(quantity, 10) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * qtyNumber : 0;

  function resetForm() {
    setSelectedProductId('');
    setQuantity('');
  }

  async function handleSell(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!selectedProduct) {
      setErrorMsg('กรุณาเลือกสินค้า');
      return;
    }
    if (qtyNumber <= 0) {
      setErrorMsg('กรุณากรอกจำนวนที่ถูกต้อง');
      return;
    }

    // ตรวจสอบสต็อกคงเหลือ
    if (qtyNumber > selectedProduct.stock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่เพียงพอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit || ''})`
      );
      return;
    }

    setProcessing(true);

    // 1) บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from('sales').insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qtyNumber,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setErrorMsg('บันทึกการขายไม่สำเร็จ: ' + saleError.message);
      setProcessing(false);
      return;
    }

    // 2) อัปเดต stock ในตาราง products ให้ลดลงตามจำนวนที่ขาย
    const newStock = selectedProduct.stock - qtyNumber;
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id);

    if (updateError) {
      setErrorMsg('อัปเดตสต็อกไม่สำเร็จ: ' + updateError.message);
      setProcessing(false);
      return;
    }

    // สำเร็จ: แจ้งเตือน, รีเซ็ตฟอร์ม, โหลดรายการสินค้าใหม่ (สต็อกล่าสุด)
    setSuccessMsg(
      `ขาย ${selectedProduct.name} จำนวน ${qtyNumber} ${selectedProduct.unit || ''} สำเร็จ (ยอดรวม ${totalPrice.toFixed(2)} บาท)`
    );
    resetForm();
    await fetchProducts();
    setProcessing(false);
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {errorMsg && <p className="error-text">{errorMsg}</p>}
      {successMsg && <p style={{ color: '#2e7d32' }}>{successMsg}</p>}

      <div className="card">
        {loading ? (
          <p>กำลังโหลดข้อมูลสินค้า...</p>
        ) : (
          <form onSubmit={handleSell}>
            <div className="form-row">
              {/* Dropdown เลือกสินค้า แสดงชื่อและราคา */}
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {Number(p.price).toFixed(2)} บาท (คงเหลือ {p.stock})
                  </option>
                ))}
              </select>

              {/* ช่องกรอกจำนวน */}
              <input
                type="number"
                placeholder="จำนวน"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
            </div>

            {/* แสดงยอดรวมอัตโนมัติ */}
            <div className="form-row">
              <strong>ยอดรวม: {totalPrice.toFixed(2)} บาท</strong>
            </div>

            <button type="submit" disabled={processing}>
              {processing ? 'กำลังบันทึก...' : 'ขาย'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
