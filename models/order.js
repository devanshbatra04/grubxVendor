var mongoose = require('mongoose');
var orderSchema = mongoose.Schema({

});

var Order = mongoose.model("order", orderSchema);


module.exports = Order;