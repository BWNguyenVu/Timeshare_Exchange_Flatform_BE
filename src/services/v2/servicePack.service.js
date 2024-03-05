const ServicePackModel = require("../../models/servicePacks")
class ServicePackService {
    async fetchAmountFormServicePack(req, res) {
        try {
            const amountData = await ServicePackModel.find();
            res.json( amountData  );
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

module.exports = new ServicePackService;
