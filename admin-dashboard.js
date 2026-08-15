const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;

const productForm = document.getElementById('product-form');
const productsTable = document.getElementById('products-tbody');
const alertContainer = document.getElementById('alert-container');
const logoutBtn = document.getElementById('admin-logout-btn');
const productImageFile = document.getElementById('product-image-file');
const productImagePreview = document.getElementById('product-image-preview');
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editModalCancel = document.getElementById('edit-product-cancel');
const editProductForm = document.getElementById('edit-product-form');
const editProductId = document.getElementById('edit-product-id');
const editProductName = document.getElementById('edit-product-name');
const editProductPrice = document.getElementById('edit-product-price');
const editProductQuantity = document.getElementById('edit-product-quantity');
const editProductCategory = document.getElementById('edit-product-category');
const editProductImageFile = document.getElementById('edit-product-image-file');
const editProductImagePreview = document.getElementById('edit-product-image-preview');

let productsCache = [];
let editingProduct = null;

function getAdminToken() {
  return localStorage.getItem('admin_token');
}

function redirectToLogin() {
  window.location.href = 'admin-login.html';
}

function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: text };
  }
}

function getDefaultImage() {
  return '/images/default.jpg';
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

async function selectedImageValue(fileInput, fallback) {
  const file = fileInput?.files?.[0];
  if (!file) {
    if (fallback) return fallback;
    throw new Error('Please select an image file.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image is too large. Please choose a file smaller than 2MB.');
  }
  return await readFileAsDataURL(file);
}

function setPreviewFromInput(fileInput, previewEl, fallback = getDefaultImage()) {
  const file = fileInput?.files?.[0];
  if (!file) {
    previewEl.src = fallback;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    previewEl.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function openEditModal() {
  editModal.classList.add('open');
  editModal.setAttribute('aria-hidden', 'false');
}

function closeEditModal() {
  editModal.classList.remove('open');
  editModal.setAttribute('aria-hidden', 'true');
  editingProduct = null;
  editProductForm.reset();
  editProductImagePreview.src = getDefaultImage();
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Failed to load products');
    const products = await res.json();
    productsCache = products;
    renderProducts(products);
  } catch (err) {
    showAlert('Error loading products', 'error');
    console.error(err);
  }
}

function renderProducts(products) {
  if (!products.length) {
    productsTable.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No products yet. Add one to get started!</td></tr>';
    return;
  }

  productsTable.innerHTML = products.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '-'}</td>
      <td>₹${p.price}</td>
      <td>${p.quantity || 0}</td>
      <td>
        <span class="stock-badge ${p.quantity > 0 ? 'stock-in' : 'stock-out'}">
          ${p.quantity > 0 ? '✓ In Stock' : '✗ Out of Stock'}
        </span>
      </td>
      <td>
        <button class="action-btn btn-edit" onclick="editProduct(${p.id})">Edit</button>
        <button class="action-btn btn-delete" onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getAdminToken() }
    });

    if (!res.ok) {
      const data = await res.json();
      showAlert(data.error || 'Delete failed', 'error');
      return;
    }

    showAlert('Product deleted successfully!', 'success');
    loadProducts();
  } catch (err) {
    showAlert('Error deleting product', 'error');
    console.error(err);
  }
}

function editProduct(productId) {
  const product = productsCache.find(p => Number(p.id) === Number(productId));
  if (!product) {
    showAlert('Product not found', 'error');
    return;
  }

  editingProduct = product;
  editProductId.value = product.id;
  editProductName.value = product.name || '';
  editProductPrice.value = product.price ?? '';
  editProductQuantity.value = product.quantity ?? 0;
  editProductCategory.value = product.category || '';
  editProductImageFile.value = '';
  editProductImagePreview.src = product.image || getDefaultImage();
  openEditModal();
}

async function buildProductPayload({ name, price, quantity, category, fileInput, currentImage }) {
  const image = await selectedImageValue(fileInput, currentImage);
  return {
    name,
    price: Number(price),
    quantity: Number(quantity),
    category,
    image
  };
}

productImagePreview.src = getDefaultImage();
editProductImagePreview.src = getDefaultImage();

productImageFile.addEventListener('change', () => {
  setPreviewFromInput(productImageFile, productImagePreview);
});

editProductImageFile.addEventListener('change', () => {
  setPreviewFromInput(editProductImageFile, editProductImagePreview, editingProduct?.image || getDefaultImage());
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('product-name').value.trim();
  const price = Number(document.getElementById('product-price').value);
  const quantity = Number(document.getElementById('product-quantity').value);
  const category = document.getElementById('product-category').value;

  if (!name || !price || quantity < 0 || !category) {
    showAlert('Please fill all required fields', 'error');
    return;
  }

  try {
    const payload = await buildProductPayload({
      name,
      price,
      quantity,
      category,
      fileInput: productImageFile,
      currentImage: null
    });

    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getAdminToken()
      },
      body: JSON.stringify(payload)
    });

    const data = await parseResponse(res);

    if (!res.ok) {
      showAlert(data.error || 'Failed to add product', 'error');
      return;
    }

    showAlert('Saree added successfully! ✓', 'success');
    productForm.reset();
    productImagePreview.src = getDefaultImage();
    loadProducts();
  } catch (err) {
    showAlert(err.message || 'Error adding product', 'error');
    console.error(err);
  }
});

editProductForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = Number(editProductId.value);
  const name = editProductName.value.trim();
  const price = Number(editProductPrice.value);
  const quantity = Number(editProductQuantity.value);
  const category = editProductCategory.value;

  if (!id || !name || !price || quantity < 0 || !category) {
    showAlert('Please fill all required fields in the edit form', 'error');
    return;
  }

  try {
    const payload = await buildProductPayload({
      name,
      price,
      quantity,
      category,
      fileInput: editProductImageFile,
      currentImage: editingProduct?.image || getDefaultImage()
    });

    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getAdminToken()
      },
      body: JSON.stringify(payload)
    });

    const data = await parseResponse(res);

    if (!res.ok) {
      showAlert(data.error || 'Failed to update product', 'error');
      return;
    }

    showAlert('Product updated successfully!', 'success');
    closeEditModal();
    loadProducts();
  } catch (err) {
    showAlert(err.message || 'Error updating product', 'error');
    console.error(err);
  }
});

editModalClose.addEventListener('click', closeEditModal);
editModalCancel.addEventListener('click', closeEditModal);

editModal.addEventListener('click', event => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  alert('You have been logged out.');
  redirectToLogin();
});

if (!getAdminToken()) {
  redirectToLogin();
} else {
  loadProducts();
}
