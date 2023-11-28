use std::mem;
use std::slice;
use std::os::raw::c_void;


#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut c_void {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    return ptr as *mut c_void;
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut c_void, cap: usize) {
    unsafe {
        let _buf = Vec::from_raw_parts(ptr, 0, cap);
    }
}

#[no_mangle]
pub extern "C" fn fill(pointer: *mut u8, w: usize, h: usize, _n: usize, j: u32, simple_mod: bool) {
    let byte_size = w * h * 4;
    let delta_h = ((25800.0 / (w as f64 * 4.0)).ceil()) as usize;

    let byte_size2 = w * h * 4 + delta_h * w * 4;
    let y2 = byte_size + 25600;
    let sl = unsafe { slice::from_raw_parts_mut(pointer, byte_size2) };
    if simple_mod {
        for y in 0..h {
            for x in 0..w {
                let pos = 4 * (y * w + x);
                if sl[pos + 2] == 255 { sl[pos + 3] = sl[pos + 3] & 0xFB; }
                if sl[pos + 2] == 0 { sl[pos + 3] = sl[pos + 3] | 0x04; }
                if (sl[pos + 3] & 0x04) > 0 { sl[pos + 2] += 1; } else { sl[pos + 2] -= 1; }
                if sl[pos + 1] == 255 { sl[pos + 3] = sl[pos + 3] & 0xFD; }
                if sl[pos + 1] == 0 { sl[pos + 3] = sl[pos + 3] | 0x02; }
                if (sl[pos + 3] & 0x02) > 0 { sl[pos + 1] += 1; } else { sl[pos + 1] -= 1; }
                if sl[pos] == 255 { sl[pos + 3] = sl[pos + 3] & 0xFE; }
                if sl[pos] == 0 { sl[pos + 3] = sl[pos + 3] | 0x01; }
                if (sl[pos + 3] & 0x01) > 0 { sl[pos] += 1; } else { sl[pos] -= 1; }
            }
        }
        // for y in 0..h {
        //     for x in 0..w {
        //         let pos = 4 * (y * w + x);
        //         sl[pos + 2] += 1;
        //         sl[pos + 1] += 1;
        //         sl[pos] += 1;
        //     }
        // }
    } else {
        let mut xp: Vec<f32> = Vec::new();
        let mut yp: Vec<f32> = Vec::new();


        for i in 0.._n {
            let val = w as f32 / 2.0 - ((j as f32 / (sl[y2 + 2 * i]) as f32).sin() * w as f32 / 2.0);
            xp.push(val);
            let val = h as f32 / 2.0 - ((j as f32 / sl[y2 + 2 * i + 1] as f32).cos() * h as f32 / 2.0);
            yp.push(val);
        }

        for v in (0..byte_size).step_by(4) {
            let y: usize = v / 4 / w;
            let x: usize = v / 4 % w;
            let mut s1 = 0.0;
            let mut s2 = 0.0;
            for i in 0.._n / 2 { s1 += ((xp[i] - x as f32) * (xp[i] - x as f32) + (yp[i] - y as f32) * (yp[i] - y as f32)).sqrt(); };
            for i in _n / 2.._n { s2 += ((xp[i] - x as f32) * (xp[i] - x as f32) + (yp[i] - y as f32) * (yp[i] - y as f32)).sqrt(); };
            let d = s1 / (s1 + s2);
            sl[v + 3] = 255;
            sl[v + 2] = sl[(d * 6400.0) as usize + byte_size];
            sl[v + 1] = sl[(d * 17920.0) as usize + byte_size];
            sl[v] = sl[(d * 11520.0) as usize + byte_size];
        }
    }
}
