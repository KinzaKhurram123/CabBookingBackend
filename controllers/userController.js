exports.getUserProfile = (req, res) => {
    res.json({
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
    });
};
