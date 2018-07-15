var mongoose = require('mongoose');
var orderSchema = mongoose.Schema({
    canteen: String,
    items: [{}],
    cust_name: String,
    contact: String,
    totals: Number,
    delivery_time: String
});

var Order = mongoose.model("order", orderSchema);


module.exports = Order;