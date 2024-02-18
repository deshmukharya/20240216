const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;

const app = express();
app.use(bodyParser.json());

/**
 * GET endpoint to retrieve all products from the product.json file.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.get('/search_all', async (req, res) => {
  try {
    // Read product data from product.json file
    const data = await fs.readFile('./product.json', 'utf-8');
    const { products } = JSON.parse(data);

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET endpoint to search for a product by ID.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.get('/search_product_by_id', async (req, res) => {
  try {
    const id = req.query.id;

    // Validate if ID is provided in the query parameters
    if (!id) {
      return res.status(400).json({ error: 'Product ID is required in the query parameters' });
    }

    // Read product data from product.json file
    const productsData = await fs.readFile('./product.json', 'utf-8');
    const products = JSON.parse(productsData).products;

    // Find the product with the specified ID
    const product = products.find((p) => p.id === id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error retrieving product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST endpoint to add a new product.
 * @param {Object} req - Express request object with product details in the request body
 * @param {Object} res - Express response object
 */
app.post('/products_add', async (req, res) => {
  try {
    const { name, description, price, stock, imageUrl } = req.body;

    // Check if all required parameters are provided in the request body
    if (!name || !description || !price || !stock || !imageUrl) {
      return res.status(400).json({ error: 'Name, description, price, stock, and imageUrl are required in the request body' });
    }

    // Read existing product data from product.json file
    const productData = await fs.readFile('./product.json', 'utf-8');
    let jsonData = JSON.parse(productData);

    // Ensure that the products property exists and is an array
    if (!jsonData.products || !Array.isArray(jsonData.products)) {
      jsonData.products = [];
    }

    // Generate a new product ID (assuming IDs are unique)
    const newProductId = String(jsonData.products.length + 1);

    // Create a new product object
    const newProduct = {
      id: newProductId,
      name: name,
      description: description,
      price: parseFloat(price),
      stock: parseInt(stock),
      imageUrl: imageUrl,
    };

    // Add the new product to the products array
    jsonData.products.push(newProduct);

    // Save the updated product data back to the product.json file
    await fs.writeFile('./product.json', JSON.stringify(jsonData, null, 2), 'utf-8');

    res.status(201).json({ id: newProductId, ...newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST endpoint to add a product to the cart.
 * @param {Object} req - Express request object with product ID and quantity in the request body
 * @param {Object} res - Express response object
 */
app.post('/checkout', async (req, res) => {
  try {
    const { id, quantity } = req.body;

    // Check if both ID and quantity are provided in the request body
    if (!id || !quantity) {
      return res.status(400).json({ error: 'Both product ID and quantity are required in the request body' });
    }

    // Read product details from products.json file
    const productsData = await fs.readFile('./product.json', 'utf-8');
    const products = JSON.parse(productsData).products;

    // Find the product with the specified ID
    const foundProduct = products.find((product) => product.id === id);

    if (!foundProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the requested quantity is less than or equal to the available stock
    if (quantity > foundProduct.stock) {
      return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
    }

    // Read existing cart data from cart.json file
    const cartData = await fs.readFile('./cart.json', 'utf-8');
    const cart = JSON.parse(cartData);

    // Check if the item already exists in the cart, update quantity if it does
    const existingCartItem = cart.find((item) => item.id === id);

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      existingCartItem.price += foundProduct.price * quantity; // Update the total price in the cart
    } else {
      // Create a new item in the cart if it doesn't exist
      const newCartItem = {
        id: id,
        quantity: quantity,
        price: foundProduct.price * quantity, // Calculate total price and store it in the cart
      };
      cart.push(newCartItem);
    }

    // Save the updated cart back to the cart.json file
    await fs.writeFile('./cart.json', JSON.stringify(cart, null, 2));

    res.json({ message: 'Item added to the cart successfully' });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST endpoint to place an order from items in the cart.
 * @param {Object} req - Express request object with order details in the request body
 * @param {Object} res - Express response object
 */
app.post('/order', async (req, res) => {
  try {
    const { id, date, address } = req.body;

    // Check if all required parameters are provided in the request body
    if (!id || !date || !address) {
      return res.status(400).json({ error: 'ID, date, and address are required in the request body' });
    }

    // Read existing cart data from cart.json file
    const cartData = await fs.readFile('./cart.json', 'utf-8');
    const cart = JSON.parse(cartData);

    if (cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Add items to the cart before placing an order.' });
    }

    // Calculate the total cost by summing up the prices of all items in the cart
    const totalCost = cart.reduce((sum, item) => sum + item.price, 0);

    // Create an order object
    const order = {
      id: id,
      date: date,
      address: address,
      status: 'pending',
      totalCost: totalCost,
      products: cart, // Include the products from the cart in the order
    };

    // Read existing order data from order.json file
    const orderData = await fs.readFile('./order.json', 'utf-8');
    const orders = JSON.parse(orderData);

    // Add the new order to the orders array
    orders.push(order);

    // Save the updated order data back to the order.json file
    await fs.writeFile('./order.json', JSON.stringify(orders, null, 2));

    // Clear the cart after placing the order
    await fs.writeFile('./cart.json', '[]');

    res.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT endpoint to update the status of a placed order.
 * @param {Object} req - Express request object with order ID and new status in the request body
 * @param {Object} res - Express response object
 */
app.put('/order_placed', async (req, res) => {
  try {
    const { id, status } = req.body;

    // Check if both ID and status are provided in the request body
    if (!id || !status) {
      return res.status(400).json({ error: 'Both order ID and status are required in the request body' });
    }

    // Read existing order data from order.json file
    const orderData = await fs.readFile('./order.json', 'utf-8');

    try {
      const orders = JSON.parse(orderData);

      // Ensure that the parsed data is an array
      if (Array.isArray(orders)) {
        // Find the order with the specified ID
        const foundOrder = orders.find((order) => order.id === id);

        if (foundOrder) {
          // Update the status of the found order
          foundOrder.status = status;

          // Save the updated order data back to the order.json file
          await fs.writeFile('./order.json', JSON.stringify(orders, null, 2));

          return res.json({ message: 'Order status updated successfully', updatedOrder: foundOrder });
        }
      }
    } catch (parseError) {
      console.error('Error parsing order data:', parseError);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    return res.status(404).json({ error: `Order with the specified ID (${id}) not found` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE endpoint to delete a specific order.
 * @param {Object} req - Express request object with order ID in the request body
 * @param {Object} res - Express response object
 */
app.delete('/delete-order', async (req, res) => {
  try {
    const { id } = req.body;

    // Check if the ID is provided in the request body
    if (!id) {
      return res.status(400).json({ error: 'Order ID is required in the request body' });
    }

    // Read existing order data from order.json file
    const orderData = await fs.readFile('./order.json', 'utf-8');

    try {
      const orders = JSON.parse(orderData);

      // Ensure that the parsed data is an array
      if (Array.isArray(orders)) {
        // Find the index of the order with the specified ID
        const orderIndex = orders.findIndex((order) => order.id === id);

        if (orderIndex !== -1) {
          // Remove the order at the found index
          orders.splice(orderIndex, 1);

          // Save the updated order data back to the order.json file
          await fs.writeFile('./order.json', JSON.stringify(orders, null, 2));

          return res.json({ message: 'Order deleted successfully' });
        }
      }
    } catch (parseError) {
      console.error('Error parsing order data:', parseError);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    return res.status(404).json({ error: `Order with the specified ID (${id}) not found` });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE endpoint to delete a specific product.
 * @param {Object} req - Express request object with product ID as a query parameter
 * @param {Object} res - Express response object
 */
app.delete('/delete_product', async (req, res) => {
  try {
    // Extract product ID from query parameters
    const productId = req.query.id;

    // Validate if product ID is provided
    if (!productId) {
      return res.status(400).json({ error: 'Invalid or missing product ID' });
    }

    // Read existing product data from product.json file
    const data = await fs.readFile('./product.json', 'utf-8');
    const jsonData = JSON.parse(data);

    // Find the index of the product with the specified ID
    const productIndex = jsonData.products.findIndex(product => product && product.id === productId);

    if (productIndex !== -1) {
      // Remove the product at the found index
      jsonData.products.splice(productIndex, 1);

      // Save the updated product data back to the product.json file
      await fs.writeFile('./product.json', JSON.stringify(jsonData, null, 2), 'utf-8');

      return res.status(200).json({ message: 'Product deleted successfully' });
    } else {
      return res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the Express server on port 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

module.exports = app;
