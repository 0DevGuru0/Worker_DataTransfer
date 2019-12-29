const inquirer = require('../index');

inquirer
    .prompt([{
        type: 'checkbox',
        message: 'Select toppings',
        name: 'toppings',
        default:true,
        choices: [
            new inquirer.Separator(' = The Meats = '),
            { name: 'Pepperoni' },
            { name: 'Ham' },
            { name: 'Ground Meat' },
            { name: 'Bacon' },

            new inquirer.Separator(' = The Cheeses = '),
            { name: 'Mozzarella'},
            { name: 'Cheddar' },
            { name: 'Parmesan' },

            new inquirer.Separator(' = The usual ='),
            { name: 'Mushroom' },
            { name: 'Tomato' },

            new inquirer.Separator(' = The extras = '),
            { name: 'Pineapple' },
            { name: 'Olives', disabled: 'out of stock' },
            { name: 'Extra cheese' }
        ],
        validate: ans=>ans.length<1?'You must choose at least one topping.':true
    }])
    .then(answers =>console.log(JSON.stringify(answers, null, '  ')));