var hello = {};

hello.index_get = function () {
    this.required_fields = ['name', 'sex', 'contact_number', 'birthday', 'age'];
    return {message : "hell1"};
}


hello.hello_get = function () {
    return {id : "24254"};
}

module.exports = hello;

