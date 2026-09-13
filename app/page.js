'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProductsPage() {
  // รายการสินค้าทั้งหมด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ฟอร์มเพิ่มสินค้าใหม่
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    price: '',
    stock: '',
    unit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // แถวที่กำลังแก้ไขแบบ inline (เก็บ id + ค่าที่แก้)
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

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
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดข้อมูลสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  // ---------- เพิ่มสินค้าใหม่ ----------
  function handleNewChange(e) {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.name) {
      setErrorMsg('กรุณากรอก SKU และชื่อสินค้า');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    const { error } = await supabase.from('products').insert([
      {
        sku: newProduct.sku,
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        stock: parseInt(newProduct.stock, 10) || 0,
        unit: newProduct.unit,
      },
    ]);

    if (error) {
      setErrorMsg('เพิ่มสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setNewProduct({ sku: '', name: '', price: '', stock: '', unit: '' });
      await fetchProducts();
    }
    setSubmitting(false);
  }

  // ---------- แก้ไขสินค้า (inline) ----------
  function startEdit(product) {
    setEditingId(product.id);
    setEditValues({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  }

  async function saveEdit(id) {
    setErrorMsg('');
    const { error } = await supabase
      .from('products')
      .update({
        sku: editValues.sku,
        name: editValues.name,
        price: parseFloat(editValues.price) || 0,
        stock: parseInt(editValues.stock, 10) || 0,
        unit: editValues.unit,
      })
      .eq('id', id);

    if (error) {
      setErrorMsg('แก้ไขสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      cancelEdit();
      await fetchProducts();
    }
  }

  // ---------- ลบสินค้า ----------
  async function handleDelete(id) {
    const confirmed = window.confirm('ยืนยันการลบสินค้านี้หรือไม่?');
    if (!confirmed) return;

    setErrorMsg('');
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      setErrorMsg('ลบสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      await fetchProducts();
    }
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h2>เพิ่มสินค้าใหม่</h2>
        <form onSubmit={handleAddProduct}>
          <div className="form-row">
            <input
              type="text"
              name="sku"
              placeholder="SKU"
              value={newProduct.sku}
              onChange={handleNewChange}
              required
            />
            <input
              type="text"
              name="name"
              placeholder="ชื่อสินค้า"
              value={newProduct.name}
              onChange={handleNewChange}
              required
            />
            <input
              type="number"
              name="price"
              placeholder="ราคา"
              value={newProduct.price}
              onChange={handleNewChange}
              step="0.01"
              min="0"
            />
            <input
              type="number"
              name="stock"
              placeholder="คงเหลือ"
              value={newProduct.stock}
              onChange={handleNewChange}
              min="0"
            />
            <input
              type="text"
              name="unit"
              placeholder="หน่วย เช่น ชิ้น, กล่อง"
              value={newProduct.unit}
              onChange={handleNewChange}
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'กำลังเพิ่ม...' : 'เพิ่มสินค้า'}
          </button>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan="6">ยังไม่มีสินค้า</td>
              </tr>
            )}
            {products.map((product) => {
              const isEditing = editingId === product.id;
              return (
                <tr key={product.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          type="text"
                          name="sku"
                          value={editValues.sku}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="name"
                          value={editValues.name}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="price"
                          value={editValues.price}
                          onChange={handleEditChange}
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="stock"
                          value={editValues.stock}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="unit"
                          value={editValues.unit}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <button onClick={() => saveEdit(product.id)}>บันทึก</button>{' '}
                        <button onClick={cancelEdit}>ยกเลิก</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{Number(product.price).toFixed(2)}</td>
                      <td>{product.stock}</td>
                      <td>{product.unit}</td>
                      <td>
                        <button onClick={() => startEdit(product)}>แก้ไข</button>{' '}
                        <button onClick={() => handleDelete(product.id)}>ลบ</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
