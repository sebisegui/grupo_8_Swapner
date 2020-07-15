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
    validationLogin :async (req,res) =>{
        let validation = validationResult(req);
        let errors = validation.errors;
        if( errors == ""){
         let usuario = await DB.Usuario.findOne( { where: { email: req.body.email }});
           if (usuario != undefined){
             if ( bcrypt.compareSync (req.body.password, usuario.password))
                req.session.userId = usuario.id;
                if(req.body.recordame){
                    res.cookie('userCookie',usuario.id,{maxAge:10000000})
                    
                }
                res.redirect('/products')
             }
        }
        res.render('login',{errors})
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
            let productosNuestros = await DB.Producto.findAll({where: { usuario_id: req.session.userId}},{
                include:['imagenes','likes','categorias','usuarios']
                })
            
            let likes = await DB.Like1.findAll({ where:{usuario_id: req.session.userId, me_gusta: 1}},{
                include:['usuarios','productos']
             })
             
             let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
                {include:['codPost']
            })
            console.log(likes)
             res.render('index',{productosDeMuestra,usuarios,productosNuestros,likes})
            },

    //DETALLE DE PRODUCTO CON SU ID
    detalleProduct: async (req, res) =>{
        let productoDetalle = await DB.Producto.findByPk(req.params.id,{
            include:['imagenes','likes','categorias','usuarios']
        })
        let productos = await DB.Producto.findAll({
            include:['imagenes','likes','categorias','usuarios']
        })
        let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
            {include:['codPost']
        
       })
       let imagen = await DB.Imagen.findAll({ where: { prod_id: req.params.id } },
        {include:['productos']
       })
    
        res.render('detalle',{productoDetalle, productos,usuarios,imagen})
       },
        
        
    
    //FORMULARIO DE CARGA DE PRODUCTO
    cargaProduct: async (req, res) =>{
        let categorias =  await DB.Categoria.findAll()
        let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
            {include:['codPost']
        })
        res.render('formulario-carga',{categorias,usuarios})
    },

    //EDITAR UN PRODUCTO CON SU ID
    edit: async (req,res,next) =>{
        let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
            {include:['codPost']
        })
        let categorias =  await DB.Categoria.findAll()
        let producto = await DB.Producto.findByPk(req.params.id,{
            include:['imagenes','likes','categorias','usuarios']
        })
        let imagen = await DB.Imagen.findAll({ where: { prod_id: req.params.id } },
            {include:['productos']
        })
        res.render('edit-form', {producto,imagen,categorias,usuarios})
    },

    //CARGAR UN PRODUCTO EN LA BASE DE DATOS
      store: async (req,res) =>{
          let producto = {
            nombre: req.body.nombre,
            categoria: req.body.categoria,
            descripcion : req.body.descripcion,
            precio : req.body.precio,
            usuario_id: req.session.userId,
            foto_portada : req.files[0].filename
          } 
          try{
              await DB.Producto.create(producto)
              res.redirect('/products')
          }
          catch (error){
              res.send ('error')
          }
      },
    
    
        
    //ACTUALIZAR PRODUCTO
    update: (req,res) =>{
        let idProducto = req.params.id;
        listaProductosJS.forEach(producto => {
            if(idProducto == producto.id){
                producto.nombre = req.body.nombre,
                producto.categoria = req.body.categoria,
                producto.descripcion = req.body.descripcion,
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
    userStore:async (req,res) =>{
        let usuarioNuevo ={
            nombre: req.body.nombre,
            telefono: req.body.telefono,
            username : req.body.username,
            email : req.body.email,
            localidad: req.body.localidad,
            //Contraseña encriptada con BCRYPT
            password: bcrypt.hashSync(req.body.contraseña),
            avatar : req.files[0].filename,
        } 
        try{
            await DB.Usuario.create(usuarioNuevo)
            res.redirect('/')
        }
        catch (error){
            console.log (error)
            res.send (error.message)
        }
    },

        // userStore = {
        //     //Estos campos los completo con el mismo nombre de la base de datos y obtengo info desde el formulario
        //     id: listaUsuariosJS[listaUsuariosJS.length - 1].id + 1,
        //     usuario_nombre: req.body.usuario_nombre,
        //     usuario_dni: req.body.usuario_dni,
        //     usuario_tag : req.body.usuario_tag,
        //     usuario_email : req.body.usuario_email,
        //     //Contraseña encriptada con BCRYPT
        //     usuario_contraseña1: bcrypt.hashSync(req.body.usuario_contraseña1, 15),
        //     usuario_contraseña2: bcrypt.hashSync(req.body.usuario_contraseña2, 15),
        //     avatar:req.files[0].filename,
        // }
        // let newDB = [...listaUsuariosJS, userStore]
        // fs.writeFileSync(usersPath, JSON.stringify(newDB, null, ' '))
        // res.redirect('/') 
    
    
}

module.exports = userController