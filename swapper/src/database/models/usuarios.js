module.exports= (sequelize,DataTypes) =>{
    const usuario = sequelize.define(
        'Usuario',
        {
            id:{
                type: DataTypes.INTEGER,
                primaryKey:true,
                autoIncrement:true
            },
            nombre:DataTypes.STRING,
            username:DataTypes.STRING,
            email:DataTypes.STRING,
            password:DataTypes.STRING,
            telefono:DataTypes.STRING,
            avatar:DataTypes.STRING,
            codigo_postal:DataTypes.INTEGER,
            localidad:DataTypes.STRING
        },
        {
            tableName:'usuarios',
            timestamps:false}
    );

    usuario.associate = function(models){
        usuario.hasMany(models.Producto,{
            as:'productos',
            foreignKey:'usuario_id',
        });
        usuario.belongsToMany(models.Producto,{
            as:'likes',
            through: 'Like1',
            timestamps:false
        })
        usuario.belongsTo(models.CodPostal,{
            as:'codPost',
            foreignKey:'codigo_postal',
        })
    
            
    };
    return usuario

}