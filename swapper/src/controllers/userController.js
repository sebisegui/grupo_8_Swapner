// REQUIRES
var express = require('express');
var router = express.Router();
const path = require ('path')
const fs = require('fs');
const bcrypt = require('bcryptjs')
const session = require('express-session');
const { check, validationResult, body } = require('express-validator');
const DB = require('../database/models')
const OP = DB.Sequelize.Op


//ACCESO A DATA BASE
const usersPath = path.join(__dirname, '../database/usersDataBase.json')
const productsPath = path.join(__dirname, '../database/productsDataBase.json')
const listaProductos = fs.readFileSync(productsPath)

// VARIABLES A UTILIZAR 
let listaUsuariosJS = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
let listaProductosJS = JSON.parse(listaProductos)

// CONTROLLER
const userController ={  
    login: (req,res) =>{
        res.render('login')
    },
    validationLogin : (req,res) =>{
        let validation = validationResult(req);
        let errors = validation.errors;
        if( errors == ""){
         let usuario = listaUsuariosJS.find( userLogin => userLogin.usuario_email == req.body.usuario_email);
         if (usuario != undefined){
            if (bcrypt.compareSync(req.body.usuario_contraseña1, usuario.usuario_contraseña1)){
                req.session.userId = usuario.id;
                if(req.body.recordame){
                    res.cookie('userCookie',usuario.id,{maxAge:10000000})
                }
                res.redirect('/products')
            }else{
                res.render('login',{errors})
            }           
        }else{
            res.render('login',{errors})
        }   
    }else{
        res.render('login',{errors})
    }
},
    logout: (req,res) =>{
        req.session.destroy()
        res.cookie('userCookie',null,{maxAge:1})
        res.redirect('/')
        },


    profile: (req,res) =>{
        let user =listaUsuariosJS.find( userToLogin => userToLogin.id == req.session.userId);
        res.render('profile',{user})

    },
    //TODOS LOS PRODUCTOS
    index: async (req, res) =>{
            let productosDeMuestra = await DB.Producto.findAll({
                limit:6},{
                include:['imagenes','likes','categorias','usuarios']
                })
             let productos = await DB.Producto.findAll({
                 include:['imagenes','likes','categorias','usuarios']
             })
             let usuarios = await DB.Usuario.findAll({
                include:['codPost']
            })
            let imagen = await DB.Imagen.findAll({ where: { foto_portada: 1}},{
                include:['productos']})
             res.render('index',{productosDeMuestra,productos,usuarios,imagen})
            },

    //DETALLE DE PRODUCTO CON SU ID
    detalleProduct: async (req, res) =>{
        let productoDetalle = await DB.Producto.findByPk(req.params.id,{
            include:['imagenes','likes','categorias','usuarios']
        })
        let productos = await DB.Producto.findAll({
            include:['imagenes','likes','categorias','usuarios']
        })
        let usuarios = await DB.Usuario.findAll({
           include:['codPost']
       })
       let imagen = await DB.Imagen.findAll({ where: { prod_id: req.params.id } },
        {include:['productos']})
    
        res.render('detalle',{productoDetalle, productos,usuarios,imagen})
       },
        
        
    
    //FORMULARIO DE CARGA DE PRODUCTO
    cargaProduct: (req, res) =>{
        res.render('formulario-carga')
    },
    //EDITAR UN PRODUCTO CON SU ID
    edit: async (req,res) =>{
        let producto = await DB.Producto.findByPk(req.params.id,{
            include:['imagenes','likes','categorias','usuarios']
        })
        res.render('edit-form', {producto:productToEdit})
    },
    //CARGAR UN PRODUCTO EN LA BASE DE DATOS
    store: (req,res) =>{
        let storeProduct ={
            id: listaProductosJS[listaProductosJS.length-1].id+1,
            nombre: req.body.nombre,
            imagen: req.body.imagen,
            zona: req.body.zona,
            categoria: req.body.categoria,
            descripcion: req.body.descripcion,
            precio: req.body.precio,
            estado: req.body.estado
        }
        listaProductosJS.push(storeProduct);
        fs.writeFileSync(productsPath,JSON.stringify(listaProductosJS))
            res.redirect('/products/')

    },     
    //ACTUALIZAR PRODUCTO
    update: (req,res) =>{
        let idProducto = req.params.id;
        listaProductosJS.forEach(producto => {
            if(idProducto == producto.id){
                producto.nombre = req.body.nombre,
                producto.categoria = req.body.categoria,
                producto.descripcion = req.body.descripcion,
                producto.estado = req.body.estado,
                producto.precio = req.body.precio,
                producto.zona = req.body.zona,
                producto.imagen = req.body.imagen
            }});
            fs.writeFileSync(productsPath,JSON.stringify(listaProductosJS))
            res.redirect('/products/')          
    },       
    //ELIMINAR PRODUCTO 
    delete: (req,res) => { 
        let deleteId = req.params.id;
        listaProductosJS.forEach(producto => {
            if(deleteId == producto.id){
                let posicionProducto = listaProductosJS.indexOf(producto);
                listaProductosJS.splice(posicionProducto,1)
            }});
            fs.writeFileSync(productsPath,JSON.stringify(listaProductosJS))
            res.redirect('/products/')
    },
    //FORMULARIO DE REGISTRO
    register: (req,res) =>{
    
        res.render('register')
    },
    //GUARDAR UN USUARIO EN BASE DE DATOS

    //Metodo para guardar un Usuario al momento de Registrarse, modificando la DB
    userStore : (req,res,next) =>{
        userStore = {
            //Estos campos los completo con el mismo nombre de la base de datos y obtengo info desde el formulario
            id: listaUsuariosJS[listaUsuariosJS.length - 1].id + 1,
            usuario_nombre: req.body.usuario_nombre,
            usuario_dni: req.body.usuario_dni,
            usuario_tag : req.body.usuario_tag,
            usuario_email : req.body.usuario_email,
            //Contraseña encriptada con BCRYPT
            usuario_contraseña1: bcrypt.hashSync(req.body.usuario_contraseña1, 15),
            usuario_contraseña2: bcrypt.hashSync(req.body.usuario_contraseña2, 15),
            avatar:req.files[0].filename,
        }
        let newDB = [...listaUsuariosJS, userStore]
        fs.writeFileSync(usersPath, JSON.stringify(newDB, null, ' '))
        res.redirect('/') 
    },
    //CHAT MENSAJES
    mensajes: (req,res)=>{
        res.render('mensajes')
    }
}

module.exports = userController