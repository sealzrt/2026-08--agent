def show_info(**info):
    for k, v in info.items():
        print(f"{k}: {v}")

show_info(name="小明", age=25, city="北京")