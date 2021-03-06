const express                = require('express'),
    mongoose                 = require("mongoose"),
    passport                 = require('passport'),
    bodyParser               = require('body-parser'),
    localStrategy            = require('passport-local'),
    passportLocalMongoose    = require('passport-local-mongoose');

var app = express();

let http                     = require('http').Server(app),
    User                     = require('./models/user'),
    Order                    = require('./models/order');
    io                       = require('socket.io')(http);

mongoose.connect("mongodb://localhost/grubxVendor");

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(require("express-session")({
    secret: "Please work this time",
    resave : false,
    saveUninitialized: false
}));
let canteens = {
    testCanteen: null,
    JC: null
}
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/////////////////////////////////////// ROUTES//////////////////////////////////////////////////////////

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/", function(req,res){
    res.render("home");
});

app.post("/register", function(req,res){
    User.register(new User({
        username : req.body.username,
        email : req.body.email,
        name: req.body.name,
        phoneNumber: req.body.phone,
        canteenNum: req.body.canteenNum
    }), req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.render('register');
        }
        else {
            console.log("user registered");
            passport.authenticate("local")(req,res, function(){
                res.redirect("secret");
            })
        }
    });
    console.log("Posted");
});
app.post('/confirm', function(req,res){
    Order.findByIdAndUpdate(req.body.id, {status:1}, function(err,order){
        order.status = 1;
        res.status(200).send(order);
    })
});
app.post('/cancel', function(req,res){
    Order.findByIdAndUpdate(req.body.id, {status:-1}, function(err,order){
        order.status = -1;
        res.status(200).send(order);
    })
});
app.post('/complete', function(req,res){
    Order.findByIdAndUpdate(req.body.id, {status:100}, function(err,order){
        order.status = 100;
        res.status(200).send(order);
    })
});
app.get("/login", function(req,res){
    res.render('login');
});

app.post('/login', passport.authenticate("local", {
    successRedirect : "/dashboard",
    failureRedirect: "/login"
}),function(req,res){

});
app.get('/getOrders', ensureLoggedIn(), function(req, res){
    res.render("OrderView")
    const canteenName = req.user.username;

});
app.get('/getCanteenOrders', function(req,res){
    Order.find({
        'canteen': req.user.username
    }, function(err, orders){
        if (err) {
            console.log(err);
        }
        console.log(orders);
        res.send(orders);
    })
    // res.send(200);
})
app.get('/dashboard',function(req, res){
    res.render('dashboard');
})

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});

app.get("/secret", ensureLoggedIn(), function(req,res){
    res.render("secret", {user:req.user});

});

io.on('connection', function(socket){
    console.log('a user connected');
    // canteenTest = socket;
    socket.on("new Connection", function(data){
        // socket.manager.onClientDisconnect(socket.id);

        canteens[data] = socket.id;
        socket.canteenName = data;
        console.log(canteens);
        Order.find({canteen: socket.canteenName}, function(err, orders){
            socket.emit("all orders", orders);
        });

            app.get("/order", (req, res) => {
                socket.emit("order", "made order");
                // console.log(canteenTest)
                console.log("new order canteen online");
            });
        app.post("/order", (req, res) => {
            console.log(req.body);
            if (typeof(req.body.items) === "string") {
                req.body.items = JSON.parse(req.body.items);
                // console.log(req.body);
            }
            req.body.status = 0;
            let newOrder = new Order(req.body);
            newOrder.save(function (err, order) {
                console.log(order);
                if (err) {
                    console.log(err);
                    res.send(err);
                }
                if (canteens[req.body.canteen] != null) {
                    io.to(canteens[req.body.canteen]).emit("post-order", order);
                    console.log(socket.id);


                    res.send(order);
                }
            });

        });
        app.post("/throwOrder", function(req, res){
            if (canteens[req.body.canteen] != null) {
                io.to(canteens[req.body.canteen]).emit("post-order", req.body);
                console.log(socket.id);


                res.send(order);
            }

        })

        app.post("/payment", (req, res) => {
            Order.findByIdAndUpdate(req.body.id, {status:2}, function(err,order){
                if (err) {
                    console.log(err);
                    res.sendStatus(400);
                }
                if (order === null ) res.sendStatus(404);
                order.status = 2;
                if (canteens[req.body.canteen] != null) {
                    io.to(canteens[req.body.canteen]).emit("new payment", order);
                    res.status(200).send(order);
                }
            });



            });

    });


    socket.on('disconnect', function(){
        console.log('user disconnected');
        console.log(socket.canteenName);
        canteens[socket.canteenName] = null;
        console.log(canteens);
    });
});
app.get("/order", (req,res)=>{
    // console.log(canteenTest)
    console.log("new order");
});

app.post("/payment", (req, res) => {
    Order.findByIdAndUpdate(req.body.id, {status:2}, function(err,order){
        if (err) {
            console.log(err);
            res.sendStatus(400);
        }
        if (order === null ) res.sendStatus(404);
        order.status = 2;
        res.status(200).send(order);

    });
});


function ensureLoggedIn() {
    return function(req, res, next) {
        // isAuthenticated is set by `deserializeUser()`
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            res.status(401).send({
                success: false,
                message: 'You need to be authenticated to access this page!'
            })
        } else {
            next()
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var port = process.env.PORT || 5001;

http.listen(port, function(){
    console.log('listening on *:' + port);
});
