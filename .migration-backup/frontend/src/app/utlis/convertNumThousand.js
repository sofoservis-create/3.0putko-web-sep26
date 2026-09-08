function convertNumbThousand(x) {
    if (!x) {
      return "0";
    }
    return x.toLocaleString("en-US");
  }
  
  export default convertNumbThousand;
  