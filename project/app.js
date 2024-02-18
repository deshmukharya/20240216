
const express = require('express');
const app = express();
require("./db/connection");

const product = require('./models/product');
const cart = require('./models/Cart');
const order = require('./models/Order');
app.use(express.json());

// Function to insert multiple products with try...catch block
/*async function insertProducts() {
    try {
        const productsData = [
            {
                id: '1',
                name: 'product1',
                description: 'Description of Product 1',
                price: 19.99,
                stock: 50,
                imageUrl: 'https://example.com/product1.jpg',
            },
            {
                id: '2',
                name: 'product2',
                description: 'Description of Product 2',
                price: 29.99,
                stock: 30,
                imageUrl: 'https://example.com/product2.jpg',
            },
            {
                id: '3',
                name: 'product3',
                description: 'Description of Product 3',
                price: 39.99,
                stock: 20,
                imageUrl: 'https://example.com/product3.jpg',
            },
            {
                id: '4',
                name: 'product4',
                description: 'Description of Product 4',
                price: 49.99,
                stock: 15,
                imageUrl: 'https://example.com/product4.jpg',
            },
        ];

        // Insert products into the database
        const insertedProducts = await product.insertMany(productsData);

        console.log(`${insertedProducts.length} products inserted successfully.`);
    } catch (error) {
        console.error('Error inserting products:', error);
    } 
}

// Call the function to insert multiple products
insertProducts();
*/


/**
 * Retrieve all products.
 *
 * @function
 * @name GET /search_all
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.get('/search_all', async (req, res) => {
    try {
        const allProducts = await product.find();

        if (allProducts.length === 0) {
            return res.status(404).json({ error: 'No products found' });
        }

        res.json(allProducts);
    } catch (error) {
        console.error('Error retrieving products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Search for a product by ID.
 *
 * @function
 * @name GET /search_product_by_id
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.get('/search_product_by_id', async (req, res) => {
    try {
        const productId = req.query.id;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required in the query parameters' });
        }

        const foundProduct = await product.findOne({ id: productId });

        if (!foundProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(foundProduct);
    } catch (error) {
        console.error('Error retrieving product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Add items to the cart.
 *
 * @function
 * @name POST /checkout
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.post('/checkout', async (req, res) => {
    try {
        const { id, quantity } = req.body;

        // Check if both ID and quantity are provided in the request body
        if (!id || !quantity) {
            return res.status(400).json({ error: 'Both product ID and quantity are required in the request body' });
        }

        const foundProduct = await product.findOne({ id: id });

        if (!foundProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the requested quantity is less than or equal to the available stock
        if (quantity > foundProduct.stock) {
            return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
        }

        // Check if the item already exists in the cart, update quantity if it does
        const existingCartItem = await cart.findOne({ id: id });

        if (existingCartItem) {
            existingCartItem.quantity += quantity;
            existingCartItem.price += foundProduct.price * quantity;
            await existingCartItem.save();
        } else {
            // Create a new item in the cart if it doesn't exist
            const newCartItem = new cart({
                id: id,
                quantity: quantity,
                price: foundProduct.price * quantity,
            });
            await newCartItem.save();
        }

        res.json({ message: 'Item added to the cart successfully' });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Place an order.
 *
 * @function
 * @name POST /order
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.post('/order', async (req, res) => {
    try {
        const { id, date, address } = req.body;

        // Check if required parameters are provided in the request body
        if (!id || !date || !address) {
            return res.status(400).json({ error: 'All parameters (id, date, address) are required in the request body' });
        }

        // Find all items in the cart
        const cartItems = await cart.find();

        // Check if the cart is empty
        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Add items to the cart before placing an order.' });
        }

        // Calculate the total cost by summing the prices of all items in the cart
        const totalCost = cartItems.reduce((total, item) => {
            return total + item.price;
        }, 0);

        // Create an order with 'Pending' status and calculated total cost
        const newOrder = new order({
            id: id,
            date: new Date(date),
            address: address,
            status: 'Pending',
            totalCost: totalCost,
        });

        // Save the order to the database
        await newOrder.save();

        res.json({ message: 'Order placed successfully' });

        // Remove all items from the cart after placing the order
        await cart.deleteMany();

    } catch (error) {
        console.error('Error during order creation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Update the status of an order.
 *
 * @function
 * @name PUT /order_placed
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.put('/order_placed', async (req, res) => {
    try {
        const { id, status } = req.body;

        // Check if required parameters are provided in the request body
        if (!id || !status) {
            return res.status(400).json({ error: 'Both orderId and status are required in the request body' });
        }

        // Find the order by orderId
        const foundOrder = await order.findOne({ id: id });

        // Check if the order exists
        if (!foundOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update the status of the order
        foundOrder.status = status;

        // Save the updated order to the database
        await foundOrder.save();

        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Delete an order.
 *
 * @function
 * @name DELETE /delete_order
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.delete('/delete_order', async (req, res) => {
    try {
        const id = req.query.id;

        // Check if orderId is provided in the query parameters
        if (!id) {
            return res.status(400).json({ error: 'id parameter is required in the query parameters' });
        }

        // Use Mongoose's deleteOne method to remove the order
        const deleteResult = await order.deleteOne({ id: id });

        // Check if the order was found and deleted
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Delete a product.
 *
 * @function
 * @name DELETE /delete_product
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.delete('/delete_product', async (req, res) => {
    try {
        const id = req.query.id;

        // Check if productId is provided in the query parameters
        if (!id) {
            return res.status(400).json({ error: 'id parameter is required in the query parameters' });
        }

        // Use Mongoose's deleteOne method to remove the product
        const deleteResult = await product.deleteOne({ id: id });

        // Check if the product was found and deleted
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Start the server.
 */
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3001');
});

module.exports = app;
