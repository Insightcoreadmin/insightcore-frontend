const socket = io('https://insightcore-backend.onrender.com');
const stripe = Stripe('your_stripe_publishable_key');

const services = [
  { id: 1, name: 'Predictive Analytics', price: 2500, description: 'Forecast trends with AI-driven models.' },
  { id: 2, name: 'Data Visualization', price: 1800, description: 'Interactive dashboards for insights.' },
  { id: 3, name: 'Data Annotation', price: 1500, description: 'High-quality data labeling for ML.' }
];

let cart = [];
let order = null;

function render() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <header class="bg-blue-600 text-white p-4 rounded shadow">
      <h1 class="text-2xl font-bold">InsightCore Analytics</h1>
      <nav class="mt-2">
        <a href="#services" class="mr-4 hover:underline">Services</a>
        <a href="#cart" class="mr-4 hover:underline">Cart (${cart.length})</a>
        <a href="#portal" class="hover:underline">Client Portal</a>
      </nav>
    </header>
    <main class="mt-6">
      <section id="services" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Our Services</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${services.map(service => `
            <div class="bg-white p-4 rounded shadow">
              <h3 class="text-lg font-bold">${service.name}</h3>
              <p class="text-gray-600">${service.description}</p>
              <p class="text-blue-600 font-semibold">$${service.price}</p>
              <button onclick="addToCart(${service.id})" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add to Cart</button>
            </div>
          `).join('')}
        </div>
      </section>
      <section id="cart" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Your Cart</h2>
        <ul class="bg-white p-4 rounded shadow">
          ${cart.map(item => `
            <li class="flex justify-between py-2">
              <span>${item.name}</span>
              <span>$${item.price}</span>
            </li>
          `).join('') || '<li>Your cart is empty.</li>'}
        </ul>
        ${cart.length > 0 ? `
          <div class="mt-4">
            <input id="email" type="email" placeholder="Email" class="border p-2 rounded w-full mb-2" />
            <button onclick="checkout()" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Checkout</button>
          </div>
        ` : ''}
      </section>
      <section id="upload" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Upload Dataset</h2>
        <button id="upload_button" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Upload File</button>
        <div id="upload_progress" class="mt-4 hidden">
          <p>Uploading: <span id="progress">0%</span></p>
          <div class="w-full bg-gray-200 rounded">
            <div id="progress_bar" class="bg-blue-600 h-2 rounded" style="width: 0%"></div>
          </div>
        </div>
      </section>
      <section id="portal" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Client Portal</h2>
        ${order ? `
          <div class="bg-white p-4 rounded shadow">
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Files:</strong> ${order.files?.join(', ') || 'None'}</p>
          </div>
        ` : '<p>No active orders.</p>'}
        <div class="mt-4">
          <iframe src="your_powerbi_report_url" width="100%" height="600px" class="rounded shadow"></iframe>
        </div>
      </section>
    </main>
  `;
}

window.addToCart = (id) => {
  const service = services.find(s => s.id === id);
  cart.push(service);
  alert(`${service.name} added to cart!`);
  render();
};

window.checkout = async () => {
  const email = document.getElementById('email').value;
  if (!email) return alert('Please enter an email.');
  const response = await fetch('https://insightcore-backend.onrender.com/api/woocommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, cart })
  });
  const session = await response.json();
  stripe.redirectToCheckout({ sessionId: session.id });
};

const uploadWidget = cloudinary.createUploadWidget({
  cloudName: 'your_cloud_name',
  uploadPreset: 'your_upload_preset'
}, (error, result) => {
  if (result.event === 'upload-progress') {
    const percent = Math.round((result.info.bytes / result.info.total_bytes) * 100);
    document.getElementById('progress').textContent = `${percent}%`;
    document.getElementById('progress_bar').style.width = `${percent}%`;
    document.getElementById('upload_progress').classList.remove('hidden');
  }
  if (result.event === 'success') {
    socket.emit('fileUploaded', { url: result.info.secure_url, orderId: order?.id });
    document.getElementById('upload_progress').classList.add('hidden');
    alert('File uploaded successfully!');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('upload_button').onclick = () => uploadWidget.open();
});

socket.on('orderUpdate', (data) => {
  order = { id: data.id, status: data.status, files: data.files };
  render();
});

socket.on('connect', () => console.log('Connected to backend'));
render();
